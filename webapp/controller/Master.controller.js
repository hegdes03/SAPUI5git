/*global history */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, History, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter,MessageToast) {
	"use strict";

	return BaseController.extend("PM.WORKORDER.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
			
    		var oView = this.getView();
            var oOrderlist = oView.byId("orderlist");
            oOrderlist.setProperty("visible", false);
            
			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);
			
		
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		 /*
		onUpdateFinished : function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},
		*/

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				this._oListFilterState.aSearch = [new Filter("Ktext", FilterOperator.Contains, sQuery)];
			
			} else {
				this._oListFilterState.aSearch = [];
			}
			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			this._oList.getBinding("items").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onOpenViewSettings : function (oEvent) {
			
			var sDialogTab = "filter";
			if (oEvent.getSource() instanceof sap.m.Button) {
				var sButtonId = oEvent.getSource().sId;
				if (sButtonId.match("sort")) {
					sDialogTab = "sort";
				} else if (sButtonId.match("group")) {
					sDialogTab = "group";
				}
			}
			// load asynchronous XML fragment
			if (!this.byId("viewSettingsDialog")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "PM.WORKORDER.view.ViewSettingsDialog",
					controller: this
				}).then(function(oDialog){
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {
				this.byId("viewSettingsDialog").open(sDialogTab);
			}
		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog : function (oEvent) {

			this._applySortGroup(oEvent);
		},

		/**
		 * Apply the chosen sorter and grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */
		_applySortGroup: function (oEvent) {
			var mParams = oEvent.getParameters(),
				sPath,
				bDescending,
				aSorters = [];
			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange : function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
			
			
    		var oView = this.getView();
            var oInputButton1 = oView.byId("input");
            oInputButton1.setProperty("visible", true);
            
            var oVertiLay1 = oView.byId("vertilay");
            oVertiLay1.setProperty("visible", false);
            
            var oRun1 = oView.byId("run");
            oRun1.setProperty("visible", false);
            
            var oAdd1 = oView.byId("create");
            oAdd1.setProperty("visible", false);
            
            var oOrderlist1 = oView.byId("orderlist");
            oOrderlist1.setProperty("visible", true);
			
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed : function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader : function (oGroup) {
			return new GroupHeaderListItem({
				title : oGroup.text,
				upperCase : false
			});
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will navigate to the shell home
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
			// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {shellHash: "#Shell-home"}
				});
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel : function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Auart",
				groupBy: "None"
			});
		},

		_onMasterMatched :  function() {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				objectId : oItem.getBindingContext().getProperty("Aufnr")
			}, bReplace);
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		 /*
		_updateListItemCount : function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}
		},
		*/

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch : function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar : function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},
		
		
		//Changes done

    onRun: function (evt) {
      this._getOpenwolist();
    },
    
    _getOpenwolist: function () {
      var oView = this.getView();
      var oModel1 = new JSONModel();
      var oOpenWOTable = oView.byId("orderlist");
      oOpenWOTable.setModel(oModel1);

      var startDateRange = this.byId("BSD");
      var startDateFrom = startDateRange.getDateValue();
      var startDateto = startDateRange.getSecondDateValue();
      var fromBasicStartDate = startDateFrom.getFullYear() + ("0" + (startDateFrom.getMonth() + 1)).slice(-2) + ("0" + startDateFrom.getDate()).slice(-2);
      var toBasicStartDate = startDateto.getFullYear() + ("0" + (startDateto.getMonth() + 1)).slice(-2) + ("0" + startDateto.getDate()).slice(-2); 
      
      
      var finDateRange = this.byId("BFD");
      var finDateFrom = finDateRange.getDateValue();
      var finDateto = finDateRange.getSecondDateValue();
      var fromBasicFinDate = finDateFrom.getFullYear() + ("0" + (finDateFrom.getMonth() + 1)).slice(-2) + ("0" + finDateFrom.getDate()).slice(-2);
      var toBasicFinDate = finDateto.getFullYear() + ("0" + (finDateto.getMonth() + 1)).slice(-2) + ("0" + finDateto.getDate()).slice(-2); 
    
      var plant = this.byId("plantInput").getValue();
      var openwo = this.byId("openwo").getSelected();
      var allwo = this.byId("allwo").getSelected();
      var closedwo = this.byId("closedwo").getSelected();
      
      var equipment = this.byId("equipment").getValue();
      var funcLoc = this.byId("funclocat").getValue();
      var orderType = this.byId("wotype").getValue();
      
      var flagopen = "";
      var flagall = "";
      var flagclosed = "";
      if (openwo) {
        flagopen = "X";
      }
      else if(allwo){
      	flagall = "X";
      }
      else if(closedwo){
      	flagclosed = "X";
      }

      var oDataSource = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
      var ostring = "/WOLISTSet/?$filter=Iwerk eq '" + plant + "' and FrBasicStdate eq '" + fromBasicStartDate + "' and ToBasicStdate eq '" + toBasicStartDate + "'";
    	  ostring = ostring + " and FrBasicFindate eq '" + fromBasicFinDate + "' and ToBasicFindate eq '" + toBasicFinDate + "' and Flagopen eq '" + flagopen + "' ";
    	  ostring = ostring + " and Flagall eq '" + flagall + "' and Flagclosed eq '" + flagclosed + "' and Equnr eq '" + equipment + "' and Tplnr eq '" + funcLoc + "' and Auart eq '" + orderType + "'"; 

      oDataSource.read(ostring, {
        success: function (oData) {
          if (oData.results.length === 0) {
            oModel1.setData(null);
            oModel1.refresh();
            
            var oInputButton = oView.byId("input");
            oInputButton.setProperty("visible", false);
            
            var oVertiLay = oView.byId("vertilay");
            oVertiLay.setProperty("visible", true);
            
            var oRun = oView.byId("run");
            oRun.setProperty("visible", true);
            
            var oAdd = oView.byId("create");
            oAdd.setProperty("visible", true);
            
            var oOrderlist = oView.byId("orderlist");
            oOrderlist.setProperty("visible", false);
            
            
            var oHeadImage = oView.byId("blueimg");
            oHeadImage.setProperty("visible", false);
            
            
			MessageToast.show("No Data Found");
            
          } else {
            oModel1.setData(oData);
            oModel1.refresh();
            
            var oInputButton1 = oView.byId("input");
            oInputButton1.setProperty("visible", true);
            
            var oVertiLay1 = oView.byId("vertilay");
            oVertiLay1.setProperty("visible", false);
            
            var oRun1 = oView.byId("run");
            oRun1.setProperty("visible", false);
            
            var oAdd1 = oView.byId("create");
            oAdd1.setProperty("visible", false);
            
            var oOrderlist1 = oView.byId("orderlist");
            oOrderlist1.setProperty("visible", true);
            
          }
        }
      });
    },
		showFooter: function() {
			this.oSemanticPage.setShowFooter(!this.oSemanticPage.getShowFooter());
		},
		
		onCreate:  function (evt) {
			
		},
		
		onInput: function (){
			
    		var oView = this.getView();
            var oInputButton = oView.byId("input");
            oInputButton.setProperty("visible", false);
            
            var oVertiLay = oView.byId("vertilay");
            oVertiLay.setProperty("visible", true);
            
            var oRun = oView.byId("run");
            oRun.setProperty("visible", true);
            
            var oAdd = oView.byId("create");
            oAdd.setProperty("visible", true);
            
            var oOrderlist = oView.byId("orderlist");
            oOrderlist.setProperty("visible", false);
            
            
      this._onCloseDetailPress();
      
		},
		
		_onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},
		
    onBarcodescan: function (evt) {
      var oView = this.getView();
      jQuery.sap.require("sap.ndc.BarcodeScanner");
      var id = evt.getParameters().id.substring(12, 22);
      sap.ndc.BarcodeScanner.scan(
        function (mResult) {
          if (mResult.cancelled === false) {
            if (id === "funcbutton") {
              oView.byId("funclocat").setValue(mResult.text);
            } else {
              oView.byId("equipment").setValue(mResult.text);
            }
          }
        },
        function (Error) {
          MessageToast.show("Scanning failed: " + Error);
        },
        function (mParams) {
          //    alert("Value entered: " + mParams.newValue);
        }
      );
    }

	});

});