/*global location */
sap.ui.define([
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/m/UploadCollectionParameter"
], function (MessageToast, MessageBox, Fragment, BaseController, JSONModel, formatter, mobileLibrary, UploadCollectionParameter) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("PM.WORKORDER.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			// Set the initial form to be the display one
			//this._showFormFragment("HeaderTabDisplay");

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function () {
			var oViewModel = this.getModel("detailView"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;

			//when create button is pressed, open create screen
			if (sObjectId === "create") {

				this.getRouter().getTargets().display("create");
			} else {

				this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
				this._bindView("/WO_GET_DETAILHEADSet('" + "00" + sObjectId + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");
			}
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", true);

			//expanded entity 
			var oView = this.getView();

			var oModel1 = new JSONModel();
			var oOpenWOTable = oView.byId("oprlist");
			oOpenWOTable.setModel(oModel1);

			var oModel2 = new JSONModel();
			var oOpenWOTable2 = oView.byId("ComList");
			oOpenWOTable2.setModel(oModel2);

			var oModel3 = new JSONModel();
			var oOpenWOTable3 = oView.byId("UploadCollection");
			oOpenWOTable3.setModel(oModel3);

			var oDataSourcetmp = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
			oDataSourcetmp.read(sObjectPath, {

				success: function (oData) {
					oViewModel.setProperty("/busy", true);
					if (oData.Orderid === null) {

						oModel1.setData(null);
						oModel1.refresh();

						oModel2.setData(null);
						oModel2.refresh();

						oModel3.setData(null);
						oModel3.refresh();

					} else {

						var tempData = Object.assign({}, oData);
						delete tempData.HeadToCompNav;
						delete tempData.HeadToOprnNav;
						var oModel = new JSONModel(tempData); // Only set data here.
						oView.setModel(oModel); // set the alias here

						oModel1.setData(oData.HeadToOprnNav);
						oModel1.refresh();

						var oprCount = oData.HeadToOprnNav.results.length;
						var oOprTabIcon = oView.byId("oprtabicon");
						oOprTabIcon.setProperty("count", oprCount);

						oModel2.setData(oData.HeadToCompNav);
						oModel2.refresh();

						var compCount = oData.HeadToCompNav.results.length;
						var oCompTabIcon = oView.byId("comptabicon");
						oCompTabIcon.setProperty("count", compCount);

						oModel3.setData(oData.HeadToAttachNav);
						oModel3.refresh();
						var attachCount = oData.HeadToAttachNav.results.length;
						var oAttachTabIcon = oView.byId("attachtabicon");
						oAttachTabIcon.setProperty("count", attachCount);
					}
					oViewModel.setProperty("/busy", false);
				}

			});

		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}
			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Aufnr,
				sObjectName = oObject.Auart,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));

		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},
		onEdit: function () {

			var oView = this.getView();
			var oDecsription = oView.byId("desc");
			oDecsription.setProperty("editable", true);

			var oActType = oView.byId("ilart");
			oActType.setProperty("editable", true);

			var oBasicStart = oView.byId("gstrp");
			oBasicStart.setProperty("editable", true);

			var oBasicFinish = oView.byId("gltrp");
			oBasicFinish.setProperty("editable", true);

			var oFuncLoc = oView.byId("tplnr");
			oFuncLoc.setProperty("editable", true);

			var oDisplay = oView.byId("display");
			oDisplay.setProperty("visible", true);

			var oCheck = oView.byId("check");
			oCheck.setProperty("visible", true);

			var oSave = oView.byId("save");
			oSave.setProperty("visible", true);

			var oEdit = oView.byId("edit");
			oEdit.setProperty("visible", false);
		},

		onDisp: function () {

			var oView = this.getView();
			var oDecsription = oView.byId("desc");
			oDecsription.setProperty("editable", false);

			var oActType = oView.byId("ilart");
			oActType.setProperty("editable", false);

			var oBasicStart = oView.byId("gstrp");
			oBasicStart.setProperty("editable", false);

			var oBasicFinish = oView.byId("gltrp");
			oBasicFinish.setProperty("editable", false);

			var oFuncLoc = oView.byId("tplnr");
			oFuncLoc.setProperty("editable", false);

			var oDisplay = oView.byId("display");
			oDisplay.setProperty("visible", false);

			var oSave = oView.byId("save");
			oSave.setProperty("visible", false);

			var oCheck = oView.byId("check");
			oCheck.setProperty("visible", false);

			var oEdit = oView.byId("edit");
			oEdit.setProperty("visible", true);
		},

		_showFormFragment: function (sFragmentName) {
			var oPage = this.byId("cont1");

			oPage.removeAllContent();
			oPage.insertContent(this._getFormFragment(sFragmentName));
		},
		_getFormFragment: function (sFragmentName) {
			var oFormFragment = this._formFragments[sFragmentName];

			if (oFormFragment) {
				return oFormFragment;
			}

			oFormFragment = sap.ui.xmlfragment(this.getView().getId(), "PM.WORKORDER.view." + sFragmentName);

			this._formFragments[sFragmentName] = oFormFragment;
			return this._formFragments[sFragmentName];
		},
		_formFragments: {},

		pressDialog: null,

		oprAdd: function () {

			var oView = this.getView();
			var wodatamodel = oView.getModel();
			var actv = wodatamodel.getObject("/MaxOperationNum");
			actv = +actv + +10;
			actv = (actv).toString();
			for (var i = actv.length; i <= 4; i++) {
				actv = 0 + actv;
				i = actv.length;
			}

			var newoprdata = {
				Activity: actv,
				OprText: "",
				WorkCenter: "",
				ControlKey: "",
				Work: "",
				Number: "",
				Uom: "HR",
				CalcKey: ""
			};

			var oModel1 = new JSONModel(newoprdata); // Only set data here.
			oView.setModel(oModel1, "addopr"); // set the alias here

			this._getFilerOptinsDialog("ListDialog", "AddOprnFrag");

		},
		
		_getFilerOptinsDialog: function (dialogId, fragment) {
			var oView = this.getView();

			if (!this.byId(dialogId)) {
				// load asynchronous XML fragment
				Fragment.load({
					id: oView.getId(),
					name: "PM.WORKORDER.view." + fragment,
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					oView.addDependent(oDialog);
					oDialog.open();
				});
			} else {
				this.byId(dialogId).open();
			}

		},

		onOprAddSave: function (oEvent) {
			var that = this;
			var oView = this.getView();
			var updOprn = oView.getModel("addopr"); // set the alias here

			var orderid = oView.getModel();
			var work = "0.0";
			if (updOprn.getObject("/Work") !== "") {
				work = updOprn.getObject("/Work");
			}

			var durationNormal = "1";
			if (updOprn.getObject("/Number") !== "") {
				durationNormal = updOprn.getObject("/Number");
			}

			var updData = {
				Orderid: orderid.getObject("/Orderid"),
				Activity: updOprn.getObject("/Activity"),
				WorkActivity: work,
				UnWork: updOprn.getObject("/Uom"),
				ControlKey: updOprn.getObject("/ControlKey"),
				NumberOfCapacities: durationNormal,
				WorkCntr: updOprn.getObject("/WorkCenter"),
				OprnPlant: orderid.getObject("/Plant"),
				Description: updOprn.getObject("/OprText")
			};

			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);

			var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");

			oDataSource.create("/WO_GET_DETAILOPRNSet", updData, {
				success: function (oData, oResponse) {
					if (oData.MessageType === "E") {
						oViewModel.setProperty("/busy", false);
						MessageToast.show(oData.MessageText);
					} else {
						oViewModel.setProperty("/busy", false);
						MessageToast.show("Updated successfully");
						that._bindView("/WO_GET_DETAILHEADSet('" + "00" + oData.Orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");
					}
				},
				error: function (oData, oResponse) {
					oViewModel.setProperty("/busy", false);
					MessageToast.show("Updated Failed");
				}
			});

			var oModel1 = new JSONModel(); // Only set data here.
			oView.setModel(oModel1, "addopr"); // set the alias here
			this.byId("ListDialog").close();
		},

		onOprAddCancel: function () {
			this.byId("ListDialog").close();
		},

		oprRemove: function (oEvent) {

			var that = this;
			var oView = this.getView();

			var compList = oView.byId("oprlist");
			var oModel = compList.getModel();
			var selItems = compList.getSelectedItems();

			if (selItems.length === 0) {

				MessageToast.show("Select operations to delete.");
			} else {

				MessageBox.information("Do you want to delete Operation(s)?", {
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.OK,
					onClose: function (sAction) {

						if (sAction === "OK") {

							var oViewModel = that.getModel("detailView");
							oViewModel.setProperty("/busy", true);

							var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
							oDataSource.setDeferredGroups(["group1"]);

							for (var i = 0; i < selItems.length; i++) {
								var Orderid = oModel.getProperty("Orderid", selItems[i].getBindingContext());
								var Actvity = oModel.getProperty("Activity", selItems[i].getBindingContext());

								var oprnSet = "/WO_GET_DETAILOPRNSet(Orderid='" + "00" + Orderid + "',Activity='" + Actvity + "')";
								oDataSource.remove(oprnSet, {
									groupId: "group1"
								});

							}

							oDataSource.submitChanges({

								groupId: "group1",

								success: function (oData, oResponse) {
									oViewModel.setProperty("/busy", false);
									MessageToast.show("Operations Deleted");
									that._bindView("/WO_GET_DETAILHEADSet('" + "00" + Orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");

								},
								error: function (oData, oResponse) {
									oViewModel.setProperty("/busy", false);
									MessageToast.show("Updated Failed");
								}

							});
						}

					}
				});
			}
		},

		handleoprconf: function (oEvent) {
			var that = this;

			var seloprn = oEvent.getSource().getBindingContext().getObject();
			var mess = "Do you want to Confirm operation " + seloprn.Activity + " Actual Work?";
			MessageBox.information(mess, {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {

						if (seloprn.ActWorkip === undefined) {
							MessageToast.show("Enter Actual work to confirm");
						} else if (seloprn.ActWorkip === 0) {
							MessageToast.show("Enter Actual work to confirm");

						} else {
							var persno = "00000001";
							if (seloprn.Persnnoip !== undefined) {
								persno = seloprn.Persnnoip;
							}

							var finalconf = "";
							if (seloprn.FinalConfip) {
								finalconf = "X";
							}

							var confData = {
								Orderid: seloprn.Orderid,
								Activity: seloprn.Activity,
								WorkActual: seloprn.ActWorkip,
								PersNo: persno,
								Complete: finalconf,
								ActionName: "ConfirmOperation"
							};

							var oViewModel = that.getModel("detailView");
							oViewModel.setProperty("/busy", true);

							var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV", {
								defaultUpdateMethod: "PUT"
							});
							oDataSource.setDeferredBatchGroups(["groupconf"]);
							var oprnconf = "/WO_GET_DETAILOPRNSet(Orderid='" + "00" + seloprn.Orderid + "',Activity='" + seloprn.Activity + "')";

							oDataSource.update(oprnconf, confData, {
								groupId: "groupconf"
							});

							oDataSource.submitChanges({
								groupId: "groupconf",

								success: function (oData, oResponse) {
									oViewModel.setProperty("/busy", false);
									var respSAPmessage = JSON.parse(oData.__batchResponses[0].__changeResponses[0].headers["sap-message"]);
									MessageToast.show(respSAPmessage.message);
									that._bindView("/WO_GET_DETAILHEADSet('" + "00" + seloprn.Orderid +
										"')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");

								},
								error: function (oData, oResponse) {
									oViewModel.setProperty("/busy", false);
									MessageToast.show("Updated Failed");
								}

							});
						}

					}
				}
			});

		},

		handlesave: function (oEvent) {

			var that = this;
			var oView = this.getView();

			var selectedTab = oView.byId("idIconTabBarMulti").getSelectedKey();

			if (selectedTab === "oprnKey") {
				var msg = "Do you want to Save Operations Data?";
			} else if (selectedTab === "compKey") {
				msg = "Do you want to Save Components Data?";
			} else {
				return;
			}

			MessageBox.information(msg, {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {

						var oViewModel = that.getModel("detailView");
						oViewModel.setProperty("/busy", true);

						var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV", {
							defaultUpdateMethod: "PUT"
						});
						oDataSource.setDeferredGroups(["groupch"]);

						if (selectedTab === "oprnKey") {

							var oprnList = oView.byId("oprlist");
							var oModel = oprnList.getModel();
							var selItems = oprnList.getSelectedItems();

							for (var i = 0; i < selItems.length; i++) {
								var Orderid = oModel.getProperty("Orderid", selItems[i].getBindingContext());
								var Actvity = oModel.getProperty("Activity", selItems[i].getBindingContext());
								var Work = oModel.getProperty("WorkActivity", selItems[i].getBindingContext());
								var unWork = oModel.getProperty("UnWork", selItems[i].getBindingContext());
								var nbCap = oModel.getProperty("NumberOfCapacities", selItems[i].getBindingContext());
								var durNormal = oModel.getProperty("DurationNormal", selItems[i].getBindingContext());

								var updData = {
									Orderid: Orderid,
									Activity: Actvity,
									WorkActivity: Work,
									UnWork: unWork,
									NumberOfCapacities: nbCap,
									DurationNormal: durNormal,
									ActionName: "UpdateOperation"
								};

								var oprnSet = "/WO_GET_DETAILOPRNSet(Orderid='" + "00" + Orderid + "',Activity='" + Actvity + "')";
								oDataSource.update(oprnSet, updData, {
									groupId: "groupch",
									method: "PUT"
								});

							}

						} else if (selectedTab === "compKey") {
							var compList = oView.byId("ComList");
							var oModel1 = compList.getModel();
							var selItemscomp = compList.getSelectedItems();

							for (var h = 0; h < selItemscomp.length; h++) {
								Orderid = oModel1.getProperty("Orderid", selItemscomp[h].getBindingContext());
								var ItemNumber = oModel1.getProperty("ItemNumber", selItemscomp[h].getBindingContext());
								var Material = oModel1.getProperty("Material", selItemscomp[h].getBindingContext());
								var Itemcat = oModel1.getProperty("Itemcat", selItemscomp[h].getBindingContext());
								var Requirementquantity = oModel1.getProperty("Requirementquantity", selItemscomp[h].getBindingContext());
								var Activity = oModel1.getProperty("Activity", selItemscomp[h].getBindingContext());

								var updData1 = {
									Orderid: Orderid,
									ItemNumber: ItemNumber,
									Material: Material,
									Itemcat: Itemcat,
									Requirementquantity: Requirementquantity,
									Activity: Activity
								};

								var compSet = "/WO_GET_DETAILCOMPSet(ItemNumber='" + ItemNumber + "',Orderid='" + "00" + Orderid + "',Activity='" +
									Activity +
									"')";
								oDataSource.update(compSet, updData1, {
									groupId: "groupch",
									method: "PUT"
								});
							}

						}

						oDataSource.submitChanges({
							groupId: "groupch",
							method: "PUT",

							success: function (oData, oResponse) {
								oViewModel.setProperty("/busy", false);
								MessageToast.show("Operations Updated");
								that._bindView("/WO_GET_DETAILHEADSet('" + "00" + Orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");

							},
							error: function (oData, oResponse) {
								oViewModel.setProperty("/busy", false);
								MessageToast.show("Updated Failed");
							}

						});

					}
				}
			});

		},

		handlerelease: function (oEvent) {

			MessageBox.information("Do you want to Release Work Order?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {
						//will be coded
					}
				}
			});

		},

		handleteco: function (oEvent) {
			MessageBox.information("Do you want to Complete Work Order?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {
						//will be coded
					}
				}
			});

		},

		compAdd: function () {

			var oView = this.getView();
			var compList = this.getView().byId("ComList");
			var oModel = compList.getModel();
			var oItems = compList.getItems();

			var act = null;
			for (var i = 0; i < oItems.length; i++) {
				var newact = oModel.getProperty("ItemNumber", oItems[i].getBindingContext());
				if (newact > act) {
					act = newact;
				}
			}

			act = +act + +10;
			act = (act).toString();
			for (i = act.length; i <= 4; i++) {
				act = 0 + act;
				i = act.length;
			}
			var newoprdata = {
				Item: act,
				Material: "",
				Itemcat: "",
				Requirementquantity: "",
				Activity: ""
			};
			var oModel1 = new JSONModel(newoprdata); // Only set data here.
			oView.setModel(oModel1, "compAdd");

			this._getFilerOptinsDialog("ListCompDialog", "AddCompFrag");
		},

		onCompAddCancel: function () {
			this.getView().getModel();

			var oView = this.getView();
			var oModel1 = new JSONModel(); // Only set data here.
			oView.setModel(oModel1, "compAdd"); // set the alias here
			this.byId("ListCompDialog").close();
		},

		onCompAddSave: function (oEvent) {
			var that = this;
			var oView = this.getView();
			var updComp = oView.getModel("compAdd"); // set the alias here

			var Orderid = oView.getModel();

			var updData = {
				Orderid: Orderid.getObject("/Orderid"),
				ItemNumber: updComp.getObject("/Item"),
				Requirementquantity: updComp.getObject("/Requirementquantity"),
				Material: updComp.getObject("/Material"),
				Itemcat: updComp.getObject("/Itemcat"),
				Activity: updComp.getObject("/Activity")
			};
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);

			var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");

			oDataSource.create("/WO_GET_DETAILCOMPSet", updData, {
				success: function (oData, oResponse) {
					oViewModel.setProperty("/busy", false);
					var orderid = Orderid.getObject("/Orderid");
					if (oData.MessageType === "E") {
						MessageToast.show(oData.MessageText);
					} else {
						oViewModel.setProperty("/busy", false);
						MessageToast.show("Updated successfully");
						that._bindView("/WO_GET_DETAILHEADSet('" + "00" + orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");
					}
				},
				error: function (oData, oResponse) {
					oViewModel.setProperty("/busy", false);
					MessageToast.show("Updated Failed");
				}
			});

			var oModel1 = new JSONModel(); // Only set data here.
			oView.setModel(oModel1, "compAdd"); // set the alias here
			this.byId("ListCompDialog").close();
		},

		compRemove: function () {

			var that = this;
			var oView = this.getView();

			var compList = oView.byId("ComList");
			var oModel = compList.getModel();
			var selItems = compList.getSelectedItems();

			if (selItems.length === 0) {

				MessageToast.show("Select component(s) to delete.");
			} else {

				MessageBox.information("Do you want to delete Component(s)?", {
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.OK,
					onClose: function (sAction) {

						var oViewModel = that.getModel("detailView");
						oViewModel.setProperty("/busy", true);

						var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
						oDataSource.setDeferredGroups(["group1"]);

						for (var i = 0; i < selItems.length; i++) {
							var Orderid = oModel.getProperty("Orderid", selItems[i].getBindingContext());
							var ItemNumber = oModel.getProperty("ItemNumber", selItems[i].getBindingContext());
							var Activity = oModel.getProperty("Activity", selItems[i].getBindingContext());
							var compSet = "/WO_GET_DETAILCOMPSet(ItemNumber='" + ItemNumber + "',Orderid='" + "00" + Orderid + "',Activity='" + Activity +
								"')";
							oDataSource.remove(compSet, {
								groupId: "group1"
							});

						}

						oDataSource.submitChanges({

							groupId: "group1",

							success: function (oData, oResponse) {
								oViewModel.setProperty("/busy", false);
								MessageToast.show("success");
								that._bindView("/WO_GET_DETAILHEADSet('" + "00" + Orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");

							},
							error: function (oData, oResponse) {
								oViewModel.setProperty("/busy", false);
								MessageToast.show("Updated Failed");
							}

						});

					}
				});
			}
		},

		onChangeImageUpload: function (oEvent) {

			var oUploadCollection = oEvent.getSource();
			var sFileType = oEvent.getParameter("files")[0].type;
			var sSecurityToken = this.getOwnerComponent().getModel().getSecurityToken();
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: sSecurityToken
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
			if (oEvent.getParameter("files")) {
				var reader = new FileReader();
				reader.onload = function (e) {
					for (var i = 0; i < oUploadCollection.getItems().length; i++) {
						if (sFileType === "image/png" || sFileType === "image/jpeg" ||
							sFileType === "image/jpg" || sFileType === "image/bmp") {
							oUploadCollection.getItems()[i].setThumbnailUrl(e.target.result);
						}
						break;
					}
				};
				reader.readAsDataURL(oEvent.getParameter("files")[0]);
			}
		},

		onBeforeUploadStarts: function (oEvent) {
			var oView = this.getView();
			var orderid = oView.getModel();

			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);
			var sFileName = oEvent.getParameter("fileName");
			sFileName = encodeURIComponent(sFileName);
			var oCustomerHeaderSlug = new UploadCollectionParameter({
				name: "slug",
				value: "00" + orderid.getObject("/Orderid") + "/" + sFileName
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
		},

		onStartUpload: function (oEvent) {
			var that = this;
			MessageBox.show("Do you want upload file?", {
				title: "Upload File",
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				emphasizedAction: MessageBox.Action.OK,
				onClose: function (sAction) {
					if (sAction === "OK") {

						var oUploadCollection = that.byId("UploadCollection");

						oUploadCollection.upload();
					}
				}
			});
		},
		onUploadComplete: function (oEvent) {
			var oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", false);
/*
			var oModel = this.getView().getModel();
			var orderid = oModel.getObject("/Orderid");
			//this._bindView("/WO_GET_DETAILHEADSet('" + "00" + orderid + "')?$expand=HeadToCompNav,HeadToOprnNav,HeadToAttachNav");

			var oView = this.getView();
			var oModel3 = new JSONModel();
			var oOpenWOTable3 = oView.byId("UploadCollection");
			oOpenWOTable3.setModel(oModel3);

			var oDataSource = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
			var ostring = "/WO_GET_ATTACHMENTSSet/?$filter=Orderid eq '" + "00" + orderid + "'";
			var oAttachTabIcon = oView.byId("attachtabicon");

			oViewModel.setProperty("/busy", true);
			oDataSource.read(ostring, {
				success: function (oData) {
					if (oData.results.length === 0) {
						oModel3.setData(null);
						oAttachTabIcon.setProperty("count", 0);
						oModel3.refresh();
						oViewModel.setProperty("/busy", false);
					} else {

						oModel3.setData(oData);
						oModel3.refresh();
						var attachCount = oData.results.length;
						oAttachTabIcon.setProperty("count", attachCount);
						oViewModel.setProperty("/busy", false);

					}
				}

			});
			*/

		},

		onFileDeleted: function (oEvent) {
			MessageToast.show("Event fileDeleted triggered");
		},

		onFileRenamed: function (oEvent) {
	//		var oData = this.byId("UploadCollection").getModel().getData();
			//var aItems = deepExtend({}, oData).items;
		//	var sDocumentId = oEvent.getParameter("documentId");
			//jQuery.each(aItems, function (index) {
			//	if (aItems[index] && aItems[index].documentId === sDocumentId) {
			//		aItems[index].fileName = oEvent.getParameter("item").getFileName();
		//		}
		//	});
		//	this.byId("UploadCollection").getModel().setData({
		//		"items": aItems
		//	});
		//	MessageToast.show("FileRenamed event triggered.");
		},
		onDeletePress: function (oEvent) {
			var oView = this.getView();
			var oViewModel = this.getModel("detailView");
			var oUploadCollection = this.byId("UploadCollection");
			var delItem = oEvent.getSource().getBindingContext().getObject().Brelguid;
			var mesText = oEvent.getSource().getBindingContext().getObject().Objdes;
			mesText = "Are you sure you want to delete " + mesText + "?";

			MessageBox.show(mesText, {
				title: "Delete File",
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					if (sAction === "OK") {
						oViewModel.setProperty("/busy", true);

						var oDataSource = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/SAP/ZPM_WO_SERVICE_SRV");
						var path = "/WO_GET_ATTACHMENTSSet(guid'" + delItem + "')";

						oDataSource.remove(path, {
							success: function (oData, oResponse) {
								for (var i = 0; i < oUploadCollection.getItems().length; i++) {
									if (oUploadCollection.getItems()[i].getProperty("documentId") === delItem) {
										oUploadCollection.removeItem(oUploadCollection.getItems()[i]);
									}

								}
								var count = oUploadCollection.aItems.length - 1;
								var oAttachTabIcon = oView.byId("attachtabicon");
								oAttachTabIcon.setProperty("count", count);

								oViewModel.setProperty("/busy", false);
								MessageToast.show("Updated successfully");
							},
							error: function (oData, oResponse) {
								oViewModel.setProperty("/busy", false);
								MessageToast.show("File Deletion Failed");
							}
						});

					}
				}
			});

		},
		oprheadedit:function(){
		this.getView().byId("headdisp").setProperty("visible", true);
		this.getView().byId("headedit").setProperty("visible", false);
		
		this.getView().byId("headdes53").setProperty("visible", false);
		this.getView().byId("headpmact53").setProperty("visible", false);
		this.getView().byId("headpmpri53").setProperty("visible", false);
		this.getView().byId("headfun53").setProperty("visible", false);
		this.getView().byId("headequ53").setProperty("visible", false);
		
		
		this.getView().byId("headdes53i").setProperty("visible", true);
		this.getView().byId("headpmact53i").setProperty("visible", true);
		this.getView().byId("headpmpri53i").setProperty("visible", true);
		this.getView().byId("headfun53i").setProperty("visible", true);
		this.getView().byId("headequ53i").setProperty("visible", true);
		},
		oprheaddisp:function(){
		this.getView().byId("headdisp").setProperty("visible", false);
		this.getView().byId("headedit").setProperty("visible", true);
		
		this.getView().byId("headdes53").setProperty("visible", true);
		this.getView().byId("headpmact53").setProperty("visible", true);
		this.getView().byId("headpmpri53").setProperty("visible", true);
		this.getView().byId("headfun53").setProperty("visible", true);
		this.getView().byId("headequ53").setProperty("visible", true);
		
		
		this.getView().byId("headdes53i").setProperty("visible", false);
		this.getView().byId("headpmact53i").setProperty("visible", false);
		this.getView().byId("headpmpri53i").setProperty("visible", false);
		this.getView().byId("headfun53i").setProperty("visible", false);
		this.getView().byId("headequ53i").setProperty("visible", false);
		},
		oprheadedit52:function(){
		this.getView().byId("headdisp52").setProperty("visible", true);
		this.getView().byId("headedit52").setProperty("visible", false);
		
		this.getView().byId("headdes52").setProperty("visible", false);
		this.getView().byId("headpmact52").setProperty("visible", false);
		this.getView().byId("headpmpri52").setProperty("visible", false);
		this.getView().byId("headfun52").setProperty("visible", false);
		this.getView().byId("headequ52").setProperty("visible", false);
		
		
		this.getView().byId("headdes52i").setProperty("visible", true);
		this.getView().byId("headpmact52i").setProperty("visible", true);
		this.getView().byId("headpmpri52i").setProperty("visible", true);
		this.getView().byId("headfun52i").setProperty("visible", true);
		this.getView().byId("headequ52i").setProperty("visible", true);
		},
		
		oprheaddisp52:function(){
		this.getView().byId("headdisp52").setProperty("visible", false);
		this.getView().byId("headedit52").setProperty("visible", true);
		
		this.getView().byId("headdes52").setProperty("visible", true);
		this.getView().byId("headpmact52").setProperty("visible", true);
		this.getView().byId("headpmpri52").setProperty("visible", true);
		this.getView().byId("headfun52").setProperty("visible", true);
		this.getView().byId("headequ52").setProperty("visible", true);
		
		
		this.getView().byId("headdes52i").setProperty("visible", false);
		this.getView().byId("headpmact52i").setProperty("visible", false);
		this.getView().byId("headpmpri52i").setProperty("visible", false);
		this.getView().byId("headfun52i").setProperty("visible", false);
		this.getView().byId("headequ52i").setProperty("visible", false);
		},
		oprheadedit54:function(){
		this.getView().byId("headdisp54").setProperty("visible", true);
		this.getView().byId("headedit54").setProperty("visible", false);
		
		this.getView().byId("desc").setProperty("visible", false);
		this.getView().byId("ilart").setProperty("visible", false);
		this.getView().byId("prio").setProperty("visible", false);
		this.getView().byId("tplnr").setProperty("visible", false);
		this.getView().byId("equnr").setProperty("visible", false);
		
		
		this.getView().byId("desc1").setProperty("visible", true);
		this.getView().byId("ilart1").setProperty("visible", true);
		this.getView().byId("prio1").setProperty("visible", true);
		this.getView().byId("tplnr1").setProperty("visible", true);
		this.getView().byId("equnr1").setProperty("visible", true);
		},
		
		oprheaddisp54:function(){
		this.getView().byId("headdisp54").setProperty("visible", false);
		this.getView().byId("headedit54").setProperty("visible", true);
		
		this.getView().byId("desc").setProperty("visible", true);
		this.getView().byId("ilart").setProperty("visible", true);
		this.getView().byId("prio").setProperty("visible", true);
		this.getView().byId("tplnr").setProperty("visible", true);
		this.getView().byId("equnr").setProperty("visible", true);
		
		
		this.getView().byId("desc1").setProperty("visible", false);
		this.getView().byId("ilart1").setProperty("visible", false);
		this.getView().byId("prio1").setProperty("visible", false);
		this.getView().byId("tplnr1").setProperty("visible", false);
		this.getView().byId("equnr1").setProperty("visible", false);
		}
		
	});

});