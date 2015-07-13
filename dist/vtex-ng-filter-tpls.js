angular.module("vtexNgFilter", []);(function() {
  angular.module('vtexNgFilter').filter('toBoolean', function() {
    return function(input) {
      return !!input;
    };
  });

}).call(this);

(function() {
  angular.module('vtexNgFilter').factory('DefaultIntervalFilter', function() {
    var DefaultIntervalFilter;
    return DefaultIntervalFilter = (function() {
      function DefaultIntervalFilter() {
        return [
          {
            name: 'today',
            interval: '[now-1d TO now]'
          }, {
            name: 'yesterday',
            interval: '[now-2d TO now-1d]'
          }, {
            name: 'thisWeek',
            interval: '[now-1w TO now]'
          }, {
            name: 'oneWeekAgo',
            interval: '[now-2w TO now-1w]'
          }, {
            name: 'twoWeeksAgo',
            interval: '[now-3w TO now-2w]'
          }, {
            name: 'thisMonth',
            interval: '[now-30d TO now]'
          }, {
            name: 'lastMonth',
            interval: '[now-60d TO now-30d]'
          }
        ];
      }

      return DefaultIntervalFilter;

    })();
  }).factory('TransactionGroup', function(TransactionFilter) {
    var TransactionGroup;
    return TransactionGroup = (function() {
      function TransactionGroup() {
        var arr;
        arr = {};
        arr["startDate"] = new TransactionFilter("startDate", "startDate", "date", "date");
        arr["authorizationDate"] = new TransactionFilter("authorizationDate", "authorizationDate", "date", "date");
        arr["commitmentDate"] = new TransactionFilter("commitmentDate", "commitmentDate", "date", "date");
        arr["cancelationDate"] = new TransactionFilter("cancelationDate", "cancelationDate", "date", "date");
        arr["payments.paymentSystemName"] = new TransactionFilter("paymentSystem", "payments.paymentSystemName", "multiple", "paymentCondition");
        arr["payments.installments"] = new TransactionFilter("installments", "payments.installments", "multiple", "paymentCondition");
        arr["payments.connectorName"] = new TransactionFilter("connectorName", "payments.connectorName", "multiple", "channel");
        arr["payments.antifraudImplementation"] = new TransactionFilter("antifraudImplementation", "payments.antifraudImplementation", "multiple", "channel");
        arr["salesChannel"] = new TransactionFilter("salesChannel", "salesChannel", "multiple", "channel");
        arr["status"] = new TransactionFilter("status", "status", "multiple", "status");
        arr["payments.refunds"] = new TransactionFilter("refunds", "payments.refunds", "multiple", "status");
        return arr;
      }

      return TransactionGroup;

    })();
  }).factory('TransactionFilter', function(DefaultIntervalFilter) {
    var FilterOption, TransactionFilter;
    FilterOption = (function() {
      function FilterOption(name, quantity, type, status, group, filterName) {
        var i, intervals, len, option, range;
        option = {
          name: name,
          quantity: quantity,
          active: status,
          group: group,
          filterName: filterName
        };
        if (type !== 'date') {
          option.value = (function(name) {
            if (typeof name === 'string' && name.indexOf(' ') >= 0) {
              name = '"' + name + '"';
            }
            return name;
          })(name);
        } else {
          intervals = new DefaultIntervalFilter();
          for (i = 0, len = intervals.length; i < len; i++) {
            range = intervals[i];
            if (range.name === name) {
              option.value = range.interval;
            }
          }
        }
        return option;
      }

      return FilterOption;

    })();
    return TransactionFilter = (function() {
      function TransactionFilter(name, url, type, group, range) {
        var self;
        self = this;
        this.name = name;
        this.url = url;
        this.type = type;
        this.group = group;
        this.active = false;
        this.options = [];
        if (type === "date" && !range) {
          this.range = new DefaultIntervalFilter();
        } else {
          this.range = range;
        }
        this.clearOptions = function() {
          return self.options = _.map(self.options, function(o) {
            o.active = false;
            o.quantity = 0;
            return o;
          });
        };
        this.setOptions = function(name, quantity, status) {
          var _active, i, len, newOption, option, ref, updatedOption;
          updatedOption = false;
          _active = false;
          ref = self.options;
          for (i = 0, len = ref.length; i < len; i++) {
            option = ref[i];
            _active = _active || option.active;
            if (name === option.name) {
              option.quantity = quantity;
              option.active = status;
              updatedOption = option;
            }
          }
          self.active = status || _active;
          if (updatedOption) {
            return updatedOption;
          } else {
            newOption = new FilterOption(name, quantity, self.type, status, group, self.name);
            self.options.push(newOption);
            return newOption;
          }
        };
      }

      return TransactionFilter;

    })();
  });

}).call(this);

(function() {
  angular.module('vtexNgFilter').service('vtFilterService', function($http, $location, $rootScope, TransactionGroup, DefaultIntervalFilter) {
    var baseInterval, getDateRangeFilter, self, setFacetsQuery, transformSearch;
    self = this;
    baseInterval = new DefaultIntervalFilter();
    getDateRangeFilter = function(date) {
      var _d, arr, j, len, range, ref;
      _d = date.url + "->";
      arr = [];
      ref = date.range;
      for (j = 0, len = ref.length; j < len; j++) {
        range = ref[j];
        arr.push("" + range.name + range.interval);
      }
      _d += arr.join(';');
      return _d;
    };
    setFacetsQuery = function(filters) {
      var queries, querystring;
      querystring = "_facets=";
      queries = [];
      _.each(filters, function(f) {
        switch (f.type) {
          case 'multiple':
            return queries.push(f.url);
          case 'date':
            return queries.push(getDateRangeFilter(f));
        }
      });
      return querystring += queries.join(',');
    };
    transformSearch = function(searchObj) {
      var basicFilters, k, search, v;
      basicFilters = new TransactionGroup();
      search = [];
      for (k in searchObj) {
        v = searchObj[k];
        if (basicFilters[k]) {
          search.push(k + "=" + v);
        }
      }
      return search.join('&');
    };
    self.filters = new TransactionGroup();
    self.activeFilters = {
      list: []
    };
    self.updateQueryString = function() {
      var availableFilters, filter, j, key, len, option, querieName, querieValue, query, ref, ref1, results, url, value;
      query = {};
      ref = self.filters;
      for (url in ref) {
        filter = ref[url];
        query[url] = query[url] || [];
        ref1 = filter.options;
        for (j = 0, len = ref1.length; j < len; j++) {
          option = ref1[j];
          if (option.active) {
            query[url].push(option.value);
          }
        }
        if (query[url].length) {
          query[url] = query[url].join(' OR ');
        } else {
          query[url] = null;
        }
      }
      availableFilters = {};
      for (key in query) {
        value = query[key];
        if (value !== null) {
          availableFilters[key] = value;
        }
      }
      $rootScope.$emit('filterChanged', {
        filterValues: availableFilters
      });
      results = [];
      for (querieName in query) {
        querieValue = query[querieName];
        results.push($location.search(querieName, querieValue));
      }
      return results;
    };
    self.clearAllFilters = function() {
      return self.filters = _.each(self.filters, function(f) {
        f.active = false;
        return _.each(f.options, function(o) {
          return o.active = false;
        });
      });
    };
    self.setFilters = function(endpoint, filters, search) {
      var locationActiveFilters;
      locationActiveFilters = self.getQueryStringFilters(search, filters);
      self.activeFilters.list = [];
      return self.getAvailableFacets(endpoint, filters, search).then(function(res) {
        return _.each(res, function(categoryOptions, categoryName) {
          var activeFilterName, filterName, filterQuantity, j, len, option, ref, results, status;
          filters[categoryName].clearOptions();
          results = [];
          for (filterName in categoryOptions) {
            filterQuantity = categoryOptions[filterName];
            if (locationActiveFilters[categoryName]) {
              ref = locationActiveFilters[categoryName];
              for (j = 0, len = ref.length; j < len; j++) {
                activeFilterName = ref[j];
                status = activeFilterName.indexOf(filterName) >= 0 ? activeFilterName : void 0;
                if (status) {
                  break;
                }
              }
            }
            if (filters[categoryName].type === "multiple") {
              status = !!status;
            }
            option = filters[categoryName].setOptions(filterName, filterQuantity, status);
            if (option.active) {
              results.push(self.activeFilters.list.push(option));
            } else {
              results.push(void 0);
            }
          }
          return results;
        });
      });
    };
    self.getQueryStringFilters = function(search, filters) {
      var interval, k, obj, v;
      obj = {};
      for (k in search) {
        v = search[k];
        if (filters[k]) {
          if (filters[k].type === 'date') {
            interval = _.find(baseInterval, function(i) {
              return i.interval === v;
            });
            v = interval.name;
          }
          obj[k] = v.split(' OR ');
        }
      }
      return obj;
    };
    self.getAvailableFacets = function(endpoint, filters, search) {
      var url;
      url = endpoint + "?" + (setFacetsQuery(filters));
      if (transformSearch(search)) {
        url += "&" + (transformSearch(search));
      }
      return $http.get(url).then(function(res) {
        return res.data;
      });
    };
    return self;
  });

}).call(this);

angular.module("vtexNgFilter").run(function($templateCache) {   'use strict';

  $templateCache.put('vtex-ng-filter-button.html',
    "<div class=\"uim-btn-filter\" ng-class=\"{ 'uim-filter-checked': activeFilters.list.length }\"><button class=\"btn\" ng-click=\"openFilterSidebar()\"><i class=\"fa fa-filter\"></i> <span class=\"uim-filter-count badge\" ng-show=\"activeFilters.list.length\">{{ activeFilters.list.length }}</span></button></div>"
  );


  $templateCache.put('vtex-ng-filter-summary.html',
    "<div class=\"filters-summary\"><span ng-if=\"activeFilters.list.length\" ng-repeat=\"filter in activeFilters.list\" ng-if=\"filter.active\"><button class=\"btn btn-xs btn-info\" ng-click=\"disableFilter(filter)\" ng-switch=\"\" on=\"filter.group\"><span ng-switch-when=\"date\">{{ ::('filters.' + filter.filterName) | translate }} : {{::((\"listing.dates.\" + filter.name) | translate)}}</span> <span ng-switch-when=\"status\">{{ ::('filters.' + filter.filterName) | translate }} : {{::(\"transactions.status.\" + (filter.name | capitalize) | translate)}}</span> <span ng-switch-default=\"\">{{ ::('filters.' + filter.filterName) | translate }} : {{::filter.name}}</span> <i class=\"fa fa-remove\"></i></button>&nbsp;</span></div>"
  );


  $templateCache.put('vtex-ng-filter.html',
    "<div class=\"filters-block\"><h3>{{ 'listing.filters' | translate }} <button class=\"btn btn-small btn-clean-filters\" ng-if=\"activeFilters.list.length\" ng-click=\"clearAllFilters()\" ga-event=\"\" ga-category=\"transaction list\" ga-action=\"clear filters\" ga-label=\"transaction filters\" translate=\"\">listing.clearAll</button></h3><div ng-repeat=\"(name, group) in groups\"><h3 class=\"group-header\"><i class=\"fa\" ng-class=\"{ 'fa-credit-card': name === 'paymentCondition',\n" +
    "                                'fa-calendar-o': name === 'date',\n" +
    "                                'fa-exchange': name === 'channel',\n" +
    "                                'fa-refresh': name === 'status', }\"></i> {{ ('filters.groups.' + name) | translate }}</h3><accordion close-others=\"true\"><accordion-group ng-repeat=\"filter in group\" ng-if=\"filter.options.length\"><accordion-heading>{{ 'filters.' + filter.name | translate }} <span class=\"label label-info pull-right\" ng-if=\"filter.active\"><i class=\"fa fa-dot-circle-o\"></i></span></accordion-heading><ul class=\"filter-list nav nav-pills nav-stacked\"><li ng-repeat=\"option in filter.options\"><div ng-class=\"{ 'disabled': !option.quantity,\n" +
    "                             'checkbox': filter.type == 'multiple',\n" +
    "                             'radio': filter.type == 'date' }\"><label ng-switch=\"\" on=\"filter.group\"><input name=\"{{ filter.url }}\" type=\"checkbox\" ng-if=\"filter.type == 'multiple'\" ng-change=\"updateQueryString()\" ng-model=\"option.active\" ng-checked=\"option.active\" ng-disabled=\"!option.quantity\"><input name=\"{{ filter.url }}\" type=\"radio\" ng-if=\"filter.type == 'date'\" ng-change=\"updateQueryString()\" ng-model=\"option.active\" ng-value=\"option.name\" ng-disabled=\"!option.quantity\"><span ng-switch-when=\"date\" translate=\"\">{{::(\"listing.dates.\" + option.name)}}</span> <span ng-switch-when=\"status\" translate=\"\">{{::(\"transactions.status.\" + (option.name | capitalize))}}</span> <span ng-switch-default=\"\">{{::option.name}}</span> <span class=\"text-muted\">({{ option.quantity }})</span></label></div></li></ul><button class=\"btn\" ng-click=\"filter.clearSelection()\" ng-show=\"filter.type === 'single' && filter.selectedItem\" translate=\"\">search.clear</button></accordion-group></accordion></div></div>"
  );
 });
(function() {
  angular.module('vtexNgFilter').directive("vtFilter", function($rootScope, $location, vtFilterService) {
    return {
      restrict: 'E',
      scope: {
        endpoint: '=endpoint'
      },
      templateUrl: 'vtex-ng-filter.html',
      link: function($scope) {
        var endpoint, filters, services;
        services = vtFilterService;
        filters = services.filters;
        endpoint = $scope.endpoint;
        $scope.groups = _.groupBy(filters, function(_f) {
          return _f.group;
        });
        $scope.activeFilters = services.activeFilters;
        $scope.clearAllFilters = function() {
          services.clearAllFilters();
          services.updateQueryString();
          return true;
        };
        $scope.updateQueryString = services.updateQueryString;
        services.setFilters(endpoint, filters).then(function(data) {
          var search;
          search = $location.search();
          if (Object.keys(search).length) {
            return services.setFilters(endpoint, filters, search);
          }
        });
        return $scope.$on('$locationChangeSuccess', function() {
          return services.setFilters(endpoint, filters, $location.search());
        });
      }
    };
  }).directive("vtFilterSummary", function(vtFilterService, $rootScope) {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: 'vtex-ng-filter-summary.html',
      link: function($scope) {
        var services;
        services = vtFilterService;
        $scope.activeFilters = services.activeFilters;
        return $scope.disableFilter = function(filter) {
          filter.active = false;
          $rootScope.$emit('filterRemoved', {
            filter: filter,
            location: 'summary'
          });
          return services.updateQueryString();
        };
      }
    };
  }).directive("vtFilterButton", function(vtFilterService) {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: 'vtex-ng-filter-button.html',
      link: function($scope) {
        return $scope.activeFilters = vtFilterService.activeFilters;
      },
      controller: function($scope, $rootScope) {
        return $scope.openFilterSidebar = function() {
          $rootScope.sidebar.show('filters');
          return $rootScope.$emit('filterToggle', {
            status: 'opened'
          });
        };
      }
    };
  });

}).call(this);
