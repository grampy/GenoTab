		/*
	
	************************************************************************
	*  N.B. now supeceded by shared generic script in 'Apps/loader' folder *
	*  but this is file retained for backwards compatibility               *
	************************************************************************
	
		© Copyright Ron Prior 2018
		
		bootstrap loader for <head> section of App
		
		use document.write the required <link>, <script> etc tags
		
		*/
		(function() {
			var fetcher = new XMLHttpRequest(), opts={};
			// parse query string parameters into opts
			document.location.search.replace(/([^?=&]+)(=([^&#]*))?/g, function($0, $1, $2, $3) {opts[$1] = $3;});
			// set defaults
			opts.app = opts.app || (document.querySelector('meta[name=application-name]') ? document.querySelector('meta[name=application-name]').content : "GenoTab");
			opts.theme =  opts.theme || (document.querySelector('script[data-theme]') ? document.querySelector('script[data-theme]').dataset.theme : '1');
			// load head for required app, default as per meta tag application-name but alternative can be specified via querystring in URL e.g. for testing ?app=GenoTabTest )
			fetcher.open("GET", "../../Apps/"+opts.app+"/head.htm", false);
			fetcher.send();
			// put head in document optionally selecting an alternative jQuery Mobile theme if specified in querystring e.g. ?theme=3
			document.write(fetcher.responseText.replace(/\{\{app\}\}/g,opts.app).replace(/\{\{theme\}\}/g,opts.theme));
	}());
