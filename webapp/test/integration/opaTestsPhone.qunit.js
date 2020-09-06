/* global QUnit */

QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"PM_WO/APP18_PLANT_MAINT_WO/test/integration/PhoneJourneys"
	], function() {
		QUnit.start();
	});
});