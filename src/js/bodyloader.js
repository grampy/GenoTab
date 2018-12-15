	/*
	
	************************************************************************
	*  N.B. now supeceded by shared generic script in 'Apps/loader' folder *
	*  but this is file retained for backwards compatibility               *
	************************************************************************
	
	© Copyright Ron Prior 2018
	
	bootstrap loader for <body> section of App
	
	use document.write the required html
	
	*/
	(function() {
			var fetcher = new XMLHttpRequest(), opts={};
			// parse query string parameters into opts
			document.location.search.replace(/([^?=&]+)(=([^&#]*))?/g, function($0, $1, $2, $3) {opts[$1] = $3;});
			// set defaults
			opts.app = opts.app || (document.querySelector('meta[name=application-name]') ? document.querySelector('meta[name=application-name]').content : "GenoTab");
			// load body for required app, default as per meta tag application-name but alternative can be specified via querystring in URL e.g. for testing ?app=GenoTabTest )
			fetcher.open("GET", "../../Apps/"+opts.app+"/body.htm", false);
			fetcher.send();
			// put body in document optionally replacing any {{app}} references
			document.write(fetcher.responseText.replace('/\{\{app\}\}/g',opts.app));
	}());
