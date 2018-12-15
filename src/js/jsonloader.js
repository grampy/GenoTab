/*
	
	************************************************************************
	*  N.B. now supeceded by shared generic script in 'Apps/loader' folder *
	*  but this is file retained for backwards compatibility               *
	************************************************************************
	
*/
(function() {
	// parse query string parameters into opts
	var opts={};
	document.location.search.replace(/([^?=&]+)(=([^&#]*))?/g, function($0, $1, $2, $3) {opts[$1] = $3;});
	if (opts.demo) opts.json = '../../Apps/demo/FamilyTree.json';
	if (!opts.file) {
		try {
			var fetcher = new XMLHttpRequest();
			fetcher.open("GET", opts.json || "FamilyTree.json", false);
			fetcher.send();
			$g.json=JSON.parse(fetcher.responseText);
			$g.jsonLoaded = true;
		} catch(e) {
			alert('Unable to load data from ' + (opts.json || 'FamilyTree.json') + ': ' + $g.errorTxt(e));
			window.close();
	}}
}());