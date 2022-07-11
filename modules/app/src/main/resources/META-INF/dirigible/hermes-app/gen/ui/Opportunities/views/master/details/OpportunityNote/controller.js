angular.module('page', ['ngAnimate', 'ui.bootstrap']);
angular.module('page')
.factory('httpRequestInterceptor', function () {
	var csrfToken = null;
	return {
		request: function (config) {
			config.headers['X-Requested-With'] = 'Fetch';
			config.headers['X-CSRF-Token'] = csrfToken ? csrfToken : 'Fetch';
			return config;
		},
		response: function(response) {
			var token = response.headers()['x-csrf-token'];
			if (token) {
				csrfToken = token;
			}
			return response;
		}
	};
})
.config(['$httpProvider', function($httpProvider) {
	$httpProvider.interceptors.push('httpRequestInterceptor');
}])
.factory('$messageHub', [function(){
	var messageHub = new FramesMessageHub();

	var message = function(evtName, data){
		messageHub.post({data: data}, 'hermes-app.Opportunities.OpportunityNote.' + evtName);
	};

	var on = function(topic, callback){
		messageHub.subscribe(callback, topic);
	};

	return {
		message: message,
		on: on,
		onEntityRefresh: function(callback) {
			on('hermes-app.Opportunities.OpportunityNote.refresh', callback);
		},
		onNoteTypeModified: function(callback) {
			on('hermes-app.Opportunities.NoteType.modified', callback);
		},
		onOpportunityModified: function(callback) {
			on('hermes-app.Opportunities.Opportunity.modified', callback);
		},
		onOpportunitySelected: function(callback) {
			on('hermes-app.Opportunities.Opportunity.selected', callback);
		},
		messageEntityModified: function() {
			message('modified');
		}
	};
}])
.controller('PageController', function ($scope, $http, $messageHub) {

	var api = '/services/v4/js/hermes-app/gen/api/Opportunities/OpportunityNote.js';
	var typeOptionsApi = '/services/v4/js/hermes-app/gen/api/Leads/NoteType.js';
	var opportunityOptionsApi = '/services/v4/js/hermes-app/gen/api/Opportunities/Opportunity.js';

	$scope.dateOptions = {
		startingDay: 1
	};
	$scope.dateFormats = ['yyyy/MM/dd', 'dd-MMMM-yyyy', 'dd.MM.yyyy', 'shortDate'];
	$scope.monthFormats = ['yyyy/MM', 'MMMM-yyyy', 'MM.yyyy', 'MMMM/yyyy'];
	$scope.weekFormats = ['yyyy/w', 'w-yyyy', 'w.yyyy', 'w/yyyy', "w"];
	$scope.dateFormat = $scope.dateFormats[0];
	$scope.monthFormat = $scope.monthFormats[1];
	$scope.weekFormat = $scope.weekFormats[3];

	$scope.typeOptions = [];

	$scope.opportunityOptions = [];

	function typeOptionsLoad() {
		$http.get(typeOptionsApi)
		.then(function(data) {
			$scope.typeOptions = data.data;
		});
	}
	typeOptionsLoad();

	function opportunityOptionsLoad() {
		$http.get(opportunityOptionsApi)
		.then(function(data) {
			$scope.opportunityOptions = data.data;
		});
	}
	opportunityOptionsLoad();

	$scope.dataPage = 1;
	$scope.dataCount = 0;
	$scope.dataOffset = 0;
	$scope.dataLimit = 50;

	$scope.getPages = function() {
		return new Array($scope.dataPages);
	};

	$scope.nextPage = function() {
		if ($scope.dataPage < $scope.dataPages) {
			$scope.loadPage($scope.dataPage + 1);
		}
	};

	$scope.previousPage = function() {
		if ($scope.dataPage > 1) {
			$scope.loadPage($scope.dataPage - 1);
		}
	};

	$scope.loadPage = function(pageNumber) {
		$scope.dataPage = pageNumber;
		$http.get(api + '/count')
		.then(function(data) {
			$scope.dataCount = data.data;
			$scope.dataPages = Math.ceil($scope.dataCount / $scope.dataLimit);
			$http.get(api + '?Opportunity=' + $scope.masterEntityId + '&$offset=' + ((pageNumber - 1) * $scope.dataLimit) + '&$limit=' + $scope.dataLimit)
			.then(function(data) {
				$scope.data = data.data;
			});
		});
	};

	$scope.openNewDialog = function() {
		$scope.actionType = 'new';
		$scope.entity = {};
		toggleEntityModal();
	};

	$scope.openEditDialog = function(entity) {
		$scope.actionType = 'update';
		$scope.entity = entity;
		$scope.entityForm.$valid = true;
		toggleEntityModal();
	};

	$scope.openDeleteDialog = function(entity) {
		$scope.actionType = 'delete';
		$scope.entity = entity;
		toggleEntityModal();
	};

	$scope.close = function() {
		$scope.loadPage($scope.dataPage);
		toggleEntityModal();
	};

	$scope.create = function() {
		if ($scope.entityForm.$valid) {
			$scope.entity.Opportunity = $scope.masterEntityId;
			$http.post(api, JSON.stringify($scope.entity))
			.then(function(data) {
				$scope.loadPage($scope.dataPage);
				toggleEntityModal();
				$messageHub.messageEntityModified();
			}, function(data) {
				alert(JSON.stringify(data.data));
			});
		}	
	};

	$scope.update = function() {
		if ($scope.entityForm.$valid) {
			$scope.entity.Opportunity = $scope.masterEntityId;

			$http.put(api + '/' + $scope.entity.Id, JSON.stringify($scope.entity))
			.then(function(data) {
				$scope.loadPage($scope.dataPage);
				toggleEntityModal();
				$messageHub.messageEntityModified();
			}, function(data) {
				alert(JSON.stringify(data.data));
			})
		}
	};

	$scope.delete = function() {
		$http.delete(api + '/' + $scope.entity.Id)
		.then(function(data) {
			$scope.loadPage($scope.dataPage);
			toggleEntityModal();
			$messageHub.messageEntityModified();
		}, function(data) {
			alert(JSON.stringify(data));
		});
	};

	$scope.updateCalculatedProperties = function() {
		var entity = $scope.entity;
	};

	$scope.timestampOpenCalendar = function($event) {
		$scope.timestampCalendarStatus.opened = true;
	};

	$scope.timestampCalendarStatus = {
		opened: false
	};

	$scope.typeOptionValue = function(optionKey) {
		for (var i = 0 ; i < $scope.typeOptions.length; i ++) {
			if ($scope.typeOptions[i].Id === optionKey) {
				return $scope.typeOptions[i].Name;
			}
		}
		return null;
	};
	$scope.opportunityOptionValue = function(optionKey) {
		for (var i = 0 ; i < $scope.opportunityOptions.length; i ++) {
			if ($scope.opportunityOptions[i].Id === optionKey) {
				return $scope.opportunityOptions[i].Name;
			}
		}
		return null;
	};

	$messageHub.onEntityRefresh($scope.loadPage($scope.dataPage));
	$messageHub.onNoteTypeModified(typeOptionsLoad);
	$messageHub.onOpportunityModified(opportunityOptionsLoad);

	$messageHub.onOpportunitySelected(function(event) {
		$scope.masterEntityId = event.data.id;
		$scope.loadPage($scope.dataPage);
	});

	function toggleEntityModal() {
		$('#entityModal').modal('toggle');
	}
});
