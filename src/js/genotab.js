// genotab.js - the scripting stuff for GenoTab

/*  (c) Ron Prior 2018
	GenoTab is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

	GenoTab is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

	You may have received a copy of the GNU General Public License along with GenoTab. If not, see <http://www.gnu.org/licenses/>.
*/
		// first a couple of 'work-arounds
			// polyfill for startsWith in IE
				if (!String.prototype.startsWith) {
					String.prototype.startsWith = function(search, pos) {
						return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
					};
				}
			// allow us to stop JQM 'enhancing' the ancestor and descendants tree pages
			// as this upsets their css based presentation and collapse/expand feature.
			// we also set data-enhance="false" on those pages main div to achieve this.
			$(document).on('mobileinit', function () {
				$g.logit('mobileinit');
				//$.mobile.autoInitializePage = false;
				$.mobile.ignoreContentEnabled = true;
			});
			//addToHomescreen();

	// and now the main body fo code
	(function (global) {    // BEGIN CLOSURE

 /**
 * @name $g
 * @namespace Holds functionality related to genopro.
 */
	var $g = global.$g = {
		version: '2016.02.16.1',
		defaults: {
			box: { border:'black', fill:'deepskyblue', width:2, z:90},
			educ: {stroke:'green'},
			emo: {stroke:'red', 'stroke-dasharray':'5,2'},
			evt: {size:3},
			fontsize: [0, 4, 8, 11, 16, 24, 32, 48, 108],
			frame: { border:'black', fill:'yellow'},
			occu: {stroke:'skyblue'},
			org: { stroke:'black', fill:'pink', width:2, z:90},
			soc: {stroke:'blue', 'stroke-dasharray':'2,2'},
			sha: {stroke:'black', fill:'#DCFFDC'},
			symbol: {size:16, sizes:[0,8,12,16, 24,32,48,72,144], r:16, transform:'translate(-16,-16)', border:'black', fill:'white', width:2},
			z: {role:80, ind: 150, fam: 100, occ: 0, edu: 0, hou: 90,emo: 90, evt: 150, sha: 90, rel: 80, pic: 95, sec: 150, soc: 90}
		},
		default_lines:3,fontFamily: '',gmap: null,hotspots: [], hotcounts: {}, json: {},mapId: '',maps: {},markers: {},nameHash: {},nameList: [],obj: '',options: {},tmpSvg: null,uid : 0,
		// map addtional actions onto jqm icons
		icons: {"atree": "arrow-u","dtree": "arrow-d","map": "grid","photo": "camera", "relate": "search"},
		standardEvents : 'birt,deat,reli,educ,occu,resi,emo,soc,marr',   // these events have their own section on the detail page
		Point: function (obj, dx, dy) {
			// normalize a point relative to the origin (dx,dy) and invert y axis
			var p = obj.split(',');
			return [parseInt(p[0]) - dx, dy - parseInt(p[1])];
		},
		Position: function (obj, dx, dy) {
			// normalize a point relative to the origin (dx,dy) and invert y axis
			var p = obj.split(',');
			return { x: parseInt(p[0]) - dx, y: dy - parseInt(p[1]) };
		},
		Points: function (obj, dx, dy) {
			// normalize points relative to the origin (dx,dy) and invert y axis
			var p, a = true, list = [];
			if (typeof obj != 'string') { // GenoPro Position.Points 
				p = ((obj && obj.$Points) ? obj.$Points : '').split(',');
			} else {	// GenoPro Position
				if (p == '') return null;
				p = obj.split(',');
			}
			for (var i = 0; i < p.length; i++) {
				list[list.length] = { x: parseInt(p[i]) - dx, y: dy - parseInt(p[++i]) };
			};
			return (typeof obj == 'string' && list.length == 1 ? list[0] : list);
		},
		Size: function (p) {
			// reformat points array into JointJS 'size' object
			return { width: p[1].x - p[0].x, height: p[1].y - p[0].y };
		},
		Splitter: function (name, max) {  // WIP
			// split name into lines up to given maximum no. of lines 
			var minline = 0, maxlines = (max ? max : this.default_lines);
			if (maxlines < 2) return name.split();
			var lines = name.split(' ');
			if (lines.length <= maxlines) return lines;
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].length > minline) minline = lines[i].length;
			};
			if (minline < name.length / parseInt(max)) minline = Math.round(name.length / parseInt(max));
			while (lines.length > maxlines) {
				lines = this.wordwrap(name, minline++);
			}
			return lines;
		},
		wordwrap: function (str, width) {
			if (!str) { return str; }

			return str.match(RegExp('\\S.{1,' + width + '}\\S(?=\\s|$)', 'g'));
		},
        breakText: function(text, size, styles, opt) {
            var width = size.width;
            var height = size.height;
			$('#tmpTxt').attr(styles || {});
            var textElement = $('#tmpTxt').get(0);
            var textSpan = textElement.firstChild;
            var textNode = document.createTextNode('');
            textSpan.appendChild(textNode);
            var full = [];
            var lines = [];
            var p;
			var l = -1;
			var paragraphs = text.split('\n');
			for (var h = 0; h < paragraphs.length; h++) {
				var words = paragraphs[h].split(' ');
				l++; 
				for (var i = 0, len = words.length; i < len; i++) {
					var word = words[i];
					textNode.data = lines[l] ? lines[l] + ' ' + word : word;
					if (textSpan.getComputedTextLength() <= width) {
						// the current line fits
						lines[l] = textNode.data;
						if (p) {
							// We were partitioning. Put rest of the word onto next line
							full[l++] = true;
							// cancel partitioning
							p = 0;
						}
					} else {
						if (!lines[l] || p) {
							var partition = !!p;
							p = word.length - 1;
							if (partition || !p) {
								// word has only one character.
								if (!p) {
									if (!lines[l]) {
										// we won't fit this text within our rect
										lines = [];
										break;
									}
									// partitioning didn't help on the non-empty line
									// try again, but this time start with a new line
									// cancel partitions created
									words.splice(i,2, word + words[i+1]);
									// adjust word length
									len--;
									full[l++] = true;
									i--;
									continue;
								}
								// move last letter to the beginning of the next word
								words[i] = word.substring(0,p);
								words[i+1] = word.substring(p) + words[i+1];
							} else {
								// We initiate partitioning
								// split the long word into two words
								words.splice(i, 1, word.substring(0,p), word.substring(p));
								// adjust words length
								len++;
								if (l && !full[l-1]) {
									// if the previous line is not full, try to fit max part of
									// the current word there
									l--;
								}
							}
							i--;
							continue;
						}
						l++;
						i--;
					}
					// if size.height is defined we have to check whether the height of the entire
					// text exceeds the rect height
					if (typeof height !== 'undefined') {
						// get line height as text height / 0.8 (as text height is approx. 0.8em
						// and line height is 1em. )
						var lh = lh || textElement.getBBox().height * 1.25;
						if (lh * lines.length > height) {
							// remove overflowing lines
							lines.splice(Math.floor(height / lh));
							break;
						}
					}
				}
			}
			textSpan.removeChild(textNode);
            return lines.join('\n');
        },
		checkMarkerId: function(pos, type, size, color) {
			// get color name or hex color without leading #
			id= $g.currentChart + 'm'+pos+type+size+'_'+color;
			return $g.markers[id];
		},
		dates: function (obj, nolabel, nolinefeed, style) {
			var prefix=(!nolabel ? $g.dic('Date')+' ' : ''), sep = (nolinefeed ? '' : '');
			var date  = obj && obj.G ? obj.G : obj;
			if (date && date instanceof Array) {
				var start = date[0], end=date[1];
				if (start && end) {
					if (start == end) {
						return prefix + $g.formatDate(start,style) + sep;
					} else {
						return prefix + $g.formatDate(start, style) + ' - ' + $g.formatDate(end, style) + sep;
					}
				} else if (start) {
					return (nolabel ? $g.formatDate(start, style) + ' - ' + sep : $g.dic('From') +' ' + $g.formatDate(start, style) + sep);
				} else if (end) {
					return (nolabel ? ' - ' + $g.formatDate(end) + sep : $g.dic('Until') +' ' + $g.formatDate(end, style) + sep);
				}
			} else if (date) {
				return prefix + $g.formatDate(date, style) + sep;
			}
			return '';
		},
		deepCopy: function(c) {
			for (var a=1; a<arguments.length; a++) {
				var p = arguments[a];
				for (var i in p) {
					if (typeof p[i] === 'object') {
						if (!c[i] && p[i]) c[i] = (p[i].constructor === Array)?[]:{};
						this.deepCopy(c[i], p[i]);
					} else if (p.hasOwnProperty(i)) c[i] = p[i];
				}
			}
			return c; 
		},
		debug: function() {
			if ($g.options.debug) debugger;
		},
		dic: function(key, group, opts) {
			// dictionary lookup with default enumeration group of 'Text', 'key can be a Javascript object path e.g. key.subkey.subsubkey etc
			if (!key || key == '') return '';
			var path = (group ? group : 'Text')+'.'+key;
			var result = i18next.t(path, opts);
			if (result == path) return key;     // return original text if not found
			return opts && opts.multi ? result.replace(/\$\$/g,opts.multi) : result;
		},
		errorTxt: function(e) {
			return 'Error: '+ (e.number>>16 & 0x1fff) + '/' + (e.number & 0xffff) + ' ' + e.description;
		},
		eventDate: function(evt, type) {
			if (evt && evt[type]) {
				var e = $g.getObjects(evt[type].pri,'evt');
				return (e.w ? $g.formatDate(e.w.G) : '');
			} else {
				return '';
			}
		},
		eventPic: function(evt, type) {
			if (evt && evt[type]) {
				var e = $g.getObjects(evt[type].pri,'evt');
				return (e.mm && e.mm.pic ? e.mm.pic : '');
			} else {
				return '';
			}
		},
		eventsByDate: function (id1,id2) {
		// helper function to sort event references into date order
			// get events from supplioed ids
			var evt1 = $g.json.evt[id1+''], evt2 = $g.json.evt[id2+''];
			// get dates 0f events
			var date1 = evt1.w && evt1.w.G ? evt1.w.G : null, date2 = evt2.w && evt2.w.G ? evt2.w.G : null;
			if (date1 instanceof Array) date1 = date1[0] != '' ? date1[0] : date1[1];
			if (date2 instanceof Array) date2 = date2[0] != '' ? date2[0] : date1[1];
			if (date1 && /^[^0-9]/.test(date1)) date1 = date1.substr(1);
			if (date2 && /^[^0-9]/.test(date2)) date2 = date2.substr(1);
			return date1 < date2 ? -1 : (date1 == date2 ? 0 : 1);
		},
		filterEvents: function(evts, filter, chart, years) {
			if (!filter) {
				var events = evts.slice();
			} else {
				var events = [];
				evts.forEach(function(id) {
					var evt = $g.json.evt[id+''];
					if (evt && (!chart || $g.json.map[chart].evt.indexOf(id)+1) && evt.w && evt.w.G) {
						var dates = $g.parseDates(evt.w.G, true);
						if ((dates[0] >= years[0] && dates[0] <= years[1]) || (dates[1] >= years[0] && dates[1] <= years[1])) events.push[id];
					}
				});
			}
			return events;
		},
		formatDate: function (dateIn, style) {
			var year, month, mon, day, date = dateIn, prefix='';
			if ( date && /^[<>~]?(\d{4}|\d{6}|\d{8})$/.test(date)) {
				switch (date.length) {
				case 4:					//year only
				case 5:
					return date; break;
				case 9:
					prefix=date.substr(0,1);
					date=date.substr(1);
				case 8:
					style = style || $g.dic('YMD','Dates');
					if (style.indexOf('d') < 0) date = date.substr(0,6);
					style = style.replace('dd', date.substr(6,2)).replace('d', parseInt(date.substr(6,2)));
				case 7:
					if (date.length == 7) {
						prefix= date.substr(0,1);
						date=date.substr(1);
					}
				case 6:					//year and month
					style = style || $g.dic('YMD','Dates');
					style = style.replace('dd','').replace('d','');
					if (style.indexOf('mmm') < 0 && style.indexOf('m') < 0) date=date.substr(0,4);
					style=style || $g.dic('Dates.YM');
					style = style.replace("y", date.substr(0,4))
					if (style.indexOf("mmm") >= 0) {
						return prefix+style.replace("mmm", $g.dic('Mon.'+parseInt(date.substr(4,2)),'Dates'));
					} else if (style.indexOf("m") >= 0) {
						return prefix+style.replace("m", $g.dic('Month.'+parseInt(date.substr(4,2)),'Dates'));
					}
				}
			}
			return date;
		},
		formatName: function(name, dates, encode) {
			var res=(name.p ? name.p + ' ' : '') +
					(name.f ? (name.f instanceof Array ? name.f.join(' ') + ' ' : name.f + ' ') : '') +
					(name.c ? '"' + name.c + '" ' : '') +
					(name.x ? name.x + ' ' : '') +
					(name.l ? (name.l instanceof Array ? name.l.join(' ') + ' ' : name.l + ' ') : '') +
					(name.e ? name.e + ' ' : '') +
					(name.s ? name.s + ' ' : '') +
					(dates && name.w ? '('+ $g.dates(name.w) + ')' : '');
			if (name.i) res = res.replace(name.f[name.i], '*'+name.f[name.i]+'*');
			if (encode) {
				res = $('<div/>').text(res).html();
				if (name.i) res = res.replace(/\*(.*)\*/,'<b>$1</b>');
			}
			return res.trim();
		},
		formatTextBox: function(opt) {
			var res = {}, box = opt.b;
			var width = box.r - box.l, height = box.b - box.t, padding = (box.a && box.a.p ? box.a.p : null);
			var margin = (!padding ? 0 : (typeof padding == 'number' ? padding * 2 : padding.l + padding.r));
			if (opt.t && opt.t != "")  res =  {'t': $g.breakText(opt.t,{width:width-margin},{'font-size': opt.s ? $g.defaults.fontsize[opt.s] :11}).split('\n'),
									'lineHeight':'1em',
									'font-size': opt.s ? $g.defaults.fontsize[opt.s] : 11,
									'font-family': 'Arial,helvetica, sans-serif'};
			res.innerWidth = width - margin;
			res.innerHeight = height - (!padding ? 0 : (typeof padding == 'number' ? padding * 2  : padding.t - padding.b));
			res.x = (!padding ? 0 : (typeof padding == 'number' ? padding  : padding.r));
			res.y = (!padding ? 0 : (typeof padding == 'number' ? padding  : padding.t));
			if (opt.t && opt.t != "") {
				var horiz = box.a && box.a.h ? box.a.h : 'c';
				var vert = box.a && box.a.v ? box.a.v : 'm';
				if (box.c && box.c.t) res['fill'] = box.c.t;
				if (horiz=='c') {
					res['text-anchor']='middle';
					res.textx=(!padding || typeof padding == 'number' ? width / 2  : padding.l + width  / 2);
				} else if (horiz=='l') {
					res['text-anchor']='start';
					res.textx=(!padding ? 0 : (typeof padding == 'number' ? padding : padding.l));
				} else {
					res['text-anchor']='end';
					res.textx=(!padding ? width : (typeof padding == 'number' ? width-padding : width-padding.r));
				}
				if (vert=='t') {
					res.texty=(!padding ? 0 : (typeof padding == 'number' ? padding : padding.t));
					res.dy='1em';
				} else if (vert=='b') {
					res.texty=(!padding ? height : (typeof padding == 'number' ? height-padding : height-padding.b));
					res.dy=-res.t.length+1+'em';
				} else {
					res.texty=(!padding || typeof padding == 'number' ? height / 2  : padding.t + height / 2);
					res.dy=(-res.t.length*0.5 + 1)+'em'
				}
			}
			return res;
		},
		generator: function() {
			$.views.helpers({attrs:$g.json.att});
			// generate 'Home' and 'Help' pages
			if (!$g.json.doc) $g.json.doc={name:'', desc:''};
			$g.json.doc._title = document.title;
			// get code version as yyyy.mm.dd
			$g.version = new Date(document.lastModified);
			$g.version = $g.version.getFullYear() + '.' + ($g.version.getMonth()+101).toString().substring(1) + '.' + ($g.version.getDate()+100).toString().substring(1);
			$('#home').html($.render.home($g.json.doc)).enhanceWithin();
			$('#helppanel').replaceWith($.render.help({topics:['Intro','Menu','Detail','About']},{opt:{"joinArrays":"$$", "multi": "</p><p>","version":$g.version,"updated":$g.json.doc.w.G}})).enhanceWithin();
			$('#panel, #mappanel').panel();
			$('#panel, #mappanel').enhanceWithin();
			 var header = $('[data-role=header]').outerHeight();
			 var panel = $('.ui-panel').height();
			 var panelheight = panel - 44;
			 $('.ui-panel').css({
				'top': 44,
				'min-height': panelheight
			 });

			// Add GenoMap charts and Google maps
			var maps=false, node = null, name, bbox, w, h, v, ind, fam, default_lines, cache;
			$.each($g.json.map, function (id, chart) {
				var title = chart.t;
				
				// add this GenoMap name to menu
				$("ul#ChartList").append('<li><a href="#cha_' + id + '">' + title + '</a></li>');

				// create jqm page for this GenoMap
				$("body").append(
					'<div id="cha_' + id + '" data-role="page">' +
						'<cite class="title">'+title+'</cite>'+
						'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="svg_'+id+'"'+
						     'style="padding: 1px; display: inline; width: inherit; height: inherit; "  text-rendering="optimizeLegibility"'+
							 ' viewBox="'+chart.b.l+' '+chart.b.t+' '+chart.b.r+' '+chart.b.b+'"'+
							 '>'+
						'<defs id="def_'+id+'"></defs>'+
						'<g id="g_'+id+'" class="viewport">'+
						'</g></svg>'+
					'</div>'
				);
				// save GenoMap bounding box offsets to transform all other points.
				$g.maps[id] = {};
				
				// add this genomap to Google Maps menu if geocoded places present
				
				if (chart.pla && chart.pla.length) {
					maps = true;
					$("ul#MapList").append('<li><a href="#" onclick="$g.mapInit(\''+id+'\');">' + title + '</a></li>');
				}
			});
			if (!maps) $("ul#MapList").hide();
			
			// build name index
			var birdate, inds = $g.json.ind, list=$g.nameList;
			$.each(inds, function(ind, obj) {
				if (obj.evt && obj.evt.birt && obj.evt.birt.pri) {
					var birt = $g.json.evt[obj.evt.birt.pri];
					birdate = (birt.date ? birt.date : '');
				} else {
					birdate = '';
				}
				if (!obj.h && obj.n) $.each((obj.n instanceof Array ? obj.n : [obj.n]), function(idx, name) {
					if (!name.k || (name.k && !name.k == "d")) {
						list[list.length] = {
							id:ind,
							idx:idx,
							l: (name.r ? name.r :
									(name.l ? (name.l instanceof Array ? name.l.reverse().join(' ') : name.l) : 
										(name.e ? name.e :'')
									)
								),
							f: (name.f ? (name.f instanceof Array ? name.f.join(' ') : name.f) : ''),
							d:birdate
						};
					}
				});
			});
			// and sort on last name, first name then date of birth
			$g.nameList.sort(function(a,b) {
					return (a.l < b.l ? -1 : 
						(a.l > b.l ? 1 : 
							(a.f < b.f ? -1 : 
								( a.f > b.f ? 1 : 
									(a.d < b.d ? -1 : 
										(a.d > b.d ? 1 : 0)
									)
								)
							)
						)
					);
			});
			// now build hash table {letter: {name: [id, id, ...]}}
			
			$.each($g.nameList, function(idx, obj) {
				var hash=$g.nameHash, name=(obj.l ? obj.l : $g.dic('?', 'NameType')), letter = name.substr(0,1);
				if (!hash[letter]) hash[letter] = {};
				if (!hash[letter][name]) hash[letter][name] = [];
				hash[letter][name].push( {"id":obj.id, "idx":obj.idx});
			});

			// generate 'People' page as a 'sort of' lazy load
			// first generate just the first letter index entries
			$('#people').html($.render.people($g.nameHash)).enhanceWithin();
			// then when 1st clicked generate last name entries
			$('#peopleindex div h4').click(function() {
				if ($(this).data('empty')) {
					var $this = this;
					var key=$('a', $this)[0].firstChild.textContent;
					$('div div',$($this).parent()[0]).append($.render.lastnames($g.nameHash[key])).enhanceWithin();
					$($this).data('empty', false); // generate once only
				}
				// and finally when last name 1st clicked generate full name entries.
				$('div h4',$($this).parent()[0]).click(function() {
					if ($(this).data('empty')) {
						var $this = this;
						var key=$('a', $this)[0].firstChild.textContent;
						$('div ul', $($this).parent()).append($.render.fullnames($g.nameHash[key.substr(0,1)][key])).enhanceWithin();
						$($this).data('empty', false); // generate once only
						$('div ul', $($this).parent()).listview('refresh');
					}
				})
			});
			
			$g.popupResize();

			//window.location.hash = 'home';
			
			$(window).resize(function(){
				// resize svg image if window resized when current page is a chart (genogram) 
				if ($.mobile.pageContainer.pagecontainer( 'getActivePage' ).attr( 'id' ).substring(0,4) == 'cha_') {
					if ($g.maps[$g.currentChart].panZoom) {
						$g.maps[$g.currentChart].panZoom.resize();
						$g.maps[$g.currentChart].panZoom.fit();
						$g.maps[$g.currentChart].panZoom.center();
					}
				}
			});
			$.mobile.initializePage();			
			$('body').pagecontainer('change', '#home', {"allowSamePageTransition":true});
		},
		getArray: function( obj) {
			// take an object { key1:value1, key2:value2 , .....} and return an array of objects [ {key:key1, value:value1},{key:key2, value:value2},....]
			var key, value,
				fields = [];
			for ( key in obj ) {
				if ( obj.hasOwnProperty( key )) {
					value = obj[ key ];
					// For each property/field add an object to the array, with key and value
					fields.push({
						key: key,
						value: value
					});
				}
			}
			// Return the array, to be rendered using {{for ~getArray(object)}}
			return fields;
		},
		getBoundingBox: function(mapItem, arrow) {
			// return the mapItem bounding box where an event/relationship line on a map pointing to the mapItem will finish. 
			// mapItem represents an individual on a genomap, i.e. a 'map' object with property data set to 'ind'.

			// if mapItem has a border set or the event line has an arrow head, use the bounding box of the whole mapItem,
			// including top and bottom labels box
			var box;
			if (mapItem.b && mapItem.b.a || arrow) {
				box = mapItem.b;
			} else { // otherwise use the bounding box the gender symbol only
				var size = mapItem.s ? $g.defaults.symbol.sizes[mapItem.s] /2 : $g.defaults.symbol.size / 2;
				box = {l:mapItem.x - size, t: mapItem.y - size, b: mapItem.y + size, r: mapItem.x + size};
			}
			return box;
		},
		getColor: function(c) {
			// if color name or hex color has 6 digits return as is otherwise convert hex rgba color to css rgba decimal format.
			if (c.substr(0,1) != '#' || c.length == 7 || c == 'none') return c;
			return c.substr(0,7)+'; fill-opacity:'+(parseInt(c.substr(7,2),16) / 255).toFixed(1) ;
		}, 
		getCoords: function(iso) {
			var coords=[2], bits = iso.match(/([-+])(\d\d)(\d\d)(\d\d\.\d*)([-+])(\d\d\d)(\d\d)(\d\d\.\d*)/);
			coords[0] = parseInt(bits[2]) + parseInt(bits[3]) / 60 + parseFloat(bits[4]) / 3600 * (bits[1]=='-' ? -1 : 1);
			coords[1] = parseInt(bits[6]) + parseInt(bits[7]) / 60 + parseFloat(bits[8]) / 3600 * (bits[5]=='-' ? -1 : 1);
			coords[2] = bits[2]+'°'+bits[3]+'\''+bits[4]+'\"'+(bits[0]=='-' ? ' S' : ' N') +', '+bits[6]+'°'+bits[7]+'\''+bits[8]+'\"'+(bits[5]=='-' ? ' E' : ' W')
			return coords;
		},
		getEvents: function(evt) {
			var events = [];
			$.each(evt, function(key, items) {
				if (!items.pri instanceof Array) items.pri = [items.pri];
				function getEvent(idx, item) {
					obj=$g.json.evt[item];
					if (obj.date) {
						event = events[events.length] = {};
						var date = (obj.date instanceof Array ? obj.date[0] : obj.date); 
						event.start_date = {};
						event.start_date.year= date.substr(0,4);
						if (date.length > 4) event.start_date.month = date.substr(4,2);
						if (date.length > 6) event.start_date.day = date.substr(6,2);
						if (obj.date instanceof Array && obj.date[1]) {
							date = obj.date[1];
							event.end_date = {};
							event.end_date.year= date.substr(0,4);
							if (date.length > 4) event.end_date.month = date.substr(4,2);
							if (date.length > 6) event.end_date.day = date.substr(6,2);
						}
						event.text = {};
						event.text.headline = $gdic.Events[obj.t];
						event.text.text = (obj.desc ? obj.desc : '');
					}
				};
				if (items.pri) $.each(items.pri, getEvent);
				if (items.sec) $.each(items.sec, getEvent);
			});
			return events;
		},
		getMapData: function(coords, map) {
			var types = {h:"HYBRID",r:"ROADMAP",s:"SATELLITE",t:"TERRAIN"}, tmp={};
			tmp.point = new  google.maps.LatLng(coords[0], coords[1]);
			tmp.data = coords[2];
			if (map.zoom) tmp.zoom = parseInt(map.zoom);
			if (map.type) tmp.type = google.maps.MapTypeId[types[map.type]];
			return tmp;
		},
		getMapDates: function(id, chart) {
			// find earliest and latest event dates associated with individuals and places on each GenoMap
			if (!chart.dates) chart.dates = {};
			if (!chart.alldates) chart.alldates = [9999,-9999];
			$.each(chart.evt, function (i, idx) {
				var p, d, y0 = null,y1 = null, evt = $g.json.evt[idx];
				if (evt.pla && evt.w && evt.w.G) {
					d = evt.w.G;
					if (d instanceof Array) {
						y0 =  d[0] ? d[0].match(/[0-9]{4}/) : null;
						y1 =  d[1] ? d[1].match(/[0-9]{4}/) : null;
					} else {
						y0 = y1 = d.match(/[0-9]{4}/)
					}
					p = evt.pla+'';
					if (y0) y0=parseInt(y0[0]);
					if (y1) y1=parseInt(y1[0]);
					if (!chart.dates[p]) chart.dates[p] = [9999,-9999]
					if (y0 && y0 < chart.dates[p][0]) chart.dates[p][0] = y0;
					if (y1 && y1 > chart.dates[p][1]) chart.dates[p][1] = y1;
					if (y0 && y0 < chart.alldates[0]) chart.alldates[0] = y0;
					if (y1 && y1 > chart.alldates[1]) chart.alldates[1] = y1;
				}
			});
			if ($g.alldates && chart.alldates[0] < $g.alldates[0]) $g.alldates[0] = chart.alldates[0];
			if ($g.alldates && chart.alldates[1] > $g.alldates[1]) $g.alldates[1] = chart.alldates[1];
		},
		getMarkerId: function(pos, type, size, color) {
			// get color name or hex color without leading #
			id= $g.currentChart + 'm'+pos+type+size+'_'+color;
			$g.markers[id] = true;
			return id;
		},
		getObjects: function (keylist, group, exclude, trace) {
		// return array of GenoPro objects from an array of ids or return a single GenoPro object from single id
		// extra properties are added to some objects to assist with the report.  These are identified with a leading _ (underscore)
		// to distinguish from (and avoid possible future clashes with) existing properties.
		// 
		// params keylist & exclude can be a single keyor an  array of keys
		
			var singleton = !(keylist instanceof Array), ret = [], obj;
			if (singleton) keylist = [ keylist ];
			if (!exclude) exclude = [];
			if (!(exclude instanceof Array)) exclude = [exclude];
			if (keylist) {
				$.each(keylist, function (idx, key) {
					key = String(key);
					obj = $g.json[group][key]
					if (!obj._upd) {
						obj._upd = true;
						obj._id = key;
						obj._type = group;
						if (obj.mm && obj.mm.pic && obj.mm.pic.length) obj._pics = obj.mm.pic;
						if (obj.mm && obj.mm.pri) obj._pic = $g.json.mm[obj.mm.pri];
						switch (group) {
							case 'ind' :
								if (!obj.n) obj.n = [{}];
								if (!(obj.n instanceof Array)) obj.n=[obj.n];
								var idx = 0;
								for (i=0; i<obj.n.length; i++) { // find 'display' name if present, otherwise default to first/only name
									if (obj.n[i].t && obj.n[i].t == 'd') {
										idx=i; break;
									}
								}
								var n = obj.n[idx];
								var forenames = (n.f && n.f instanceof Array ? n.f.join(' ') : (n.f ? n.f : '')),
									lastnames = (n.l && n.l instanceof Array ? n.l.join(' ') : (n.l ? n.l : ''));
								if (forenames + lastnames == '') lastnames = (n.e || n.c || $g.dic('Unknown'));
								obj.names = forenames + (forenames && lastnames ? ' ' : '') + lastnames;
								if (obj.evt && obj.evt.birt && obj.evt.birt.pri) obj.bir = $g.json.evt[obj.evt.birt.pri];
								if (obj.evt && obj.evt.deat && obj.evt.deat.pri) obj.dea = $g.json.evt[obj.evt.deat.pri];
								if ((obj.bir && obj.bir.w && obj.bir.w.G) || (obj.dea && obj.dea.w && obj.dea.w.G)) {
									obj.life=[(obj.bir && obj.bir.w && obj.bir.w.G ? obj.bir.w.G :''),(obj.dea && obj.dea.w && obj.dea.w.G ? obj.dea.w.G :'')];
								}
								if (!obj.g && !obj.h) obj.g='U';
								if (obj.ref && obj.ref.rel) {
									var rels = (obj.ref.rel instanceof Array ? obj.ref.rel : [obj.ref.rel])  // convert single ref to array
									var i=0, rel, type, types = { B:'bio', A:'ado', F:'fos'};
									while (rel = $g.json.rel[rels[i++]]) {
										if (rel.k && types[rel.k]) {
											type = types[rel.k];
											if (!obj[type]) obj[type] = [];
											obj[type].push(rel.fam);  // add to list of biological, adoption or foster families he/she is a child in
										} else {
											if (!obj.fam) obj.fam = [];
											obj.fam.push(rel.fam); // add to list of families he/she is a parent/partner in
										}
									}
								}
								if (obj.map) { // create a list of 'map mapobject' pairs to simplify linking from one map/chart to next for hypelinks
									obj._map=[];
									Object.keys(obj.map).forEach(function(key){obj.map[key].forEach(function(mapobj){obj._map.push(key+" "+mapobj)});});
								}
								break;
							case 'fam' :
								if (obj.ref && obj.ref.rel) {
									var rels = (obj.ref.rel instanceof Array ? obj.ref.rel : [obj.ref.rel])  // convert single ref to array
									var i=0, rel, mfu;
									while (rel = $g.json.rel[rels[i++]]) {
										mfu = $g.json.ind[rel.ind].g;
										mfu = (mfu || 'u').toLowerCase();
										if (rel.k) { // its a child relationship (Biological, Adopted or Fostered) of
											// add list of children and lists by gender too
											if (!obj._c) obj._c = [];
											obj._c.push(rel.ind);
											if (!obj['_c'+mfu]) obj['_c'+mfu] = [];
											obj['_c'+mfu].push(rel.ind);
										} else {
											// add list of parents and lists by gender too
											if (!obj._p) obj._p = [];
											obj._p.push(rel.ind);
											if (!obj['_p'+mfu]) obj['_p'+mfu] = [];
											obj['_p'+mfu].push(rel.ind);
										}
									}
								}
								break;
							case 'mm' :
								if (obj.p.e) {
									obj.path = $g.options.data ? $g.options.data + obj.p.e : obj.p.e;
								} else {
									obj.path = obj.p.s;
								}
								break;
							case 'org' :
							case 'pla' :
								if (!obj.n) obj.n = [{}];
								if (!(obj.n instanceof Array)) obj.n=[obj.n];
								obj.name= obj.n[0].e ? obj.n[0].e : $g.dic('Unknown');
								break;
						}
					}
					if (exclude.indexOf(key) == -1) ret[ret.length] = obj;
				});
			}
			//#  $g.logit('getObjects', group, keylist, ret);
			return (singleton ? ret[0] : ret);
		},
		getPath: function(line, e1, e2, fam, child, twinx) {
			// get points for path for pedigree link, evt or shape
			var path = 'M', points = line.p;
			if (fam) path += ' ' + (twinx ? twinx : (points ? points[0].x : e1.x)) + ' ' + (child && fam.b ? fam.b.y : fam.y);
			if (e2) {path += ' ' + e2.x + ' ' + e2.y;}
			if (points) points.forEach(function(point) {path+=' ' + point.x + ' ' + point.y;});
			if (e1) {path += ' ' + e1.x + ' ' + e1.y;}
			return path;
		},
		getPathIntersect: function(line, e2, e1) {

			// get any intermediate points on the (poly)line
			var pat, points = line.p;

			//Find intersection of line with entity1

			// first determine exterior point of line

			if (points) { // it has intermediate points so get the 1st one as exterior end of line
				xExt = points[0].x;
				yExt = points[0].y;
			} else {
				if (e2.data && e2.data.ind) {
					xExt = e2.x;
					yExt = e2.y;
				} else {
					xExt = e2.b.l  + (e2.b.r - e2.b.l) / 2;
					yExt = e2.b.t  + (e2.b.b - e2.b.t) / 2;
				}
			}
			// then find the interior point
			// and find intersection with it
			
			pat = $g.getPattern(line);
			if (e1.data && e1.data.ind) { // it's an individual so find its bounding box
				xy = $g.lineBoxIntersect(e1.x, e1.y, xExt, yExt, $g.getBoundingBox(e1, pat.m && pat.m.s));
				
			} else { // get the interior point i.e. centre of label or social entity
				xy = $g.lineBoxIntersect(e1.b.l + (e1.b.r - e1.b.l) / 2, e1.b.t  + (e1.b.b - e1.b.t) / 2, xExt, yExt, e1.b);
			}
			
			// Find intersection of line with entity2
			if (points) {
				xExt = points[points.length-1].x;
				yExt = points[points.length-1].y;
			} else {
				if (e1.data && e1.data.ind) { // it's an individual
					xExt = e1.x;
					yExt = e1.y;
				} else {
					xExt = e1.b.l  + (e1.b.r - e1.b.l) / 2;
					yExt = e1.b.t  + (e1.b.b - e1.b.t) / 2;
				}
			}
			if (e2.data && e2.data.ind) { // it's an individual so find its bounding box
				xyEnd = $g.lineBoxIntersect(e2.x, e2.y, xExt, yExt, $g.getBoundingBox(e2, pat.m && pat.m.s));
				
			} else { // get the interior point i.e. centre of label or social entity
				xyEnd = $g.lineBoxIntersect(e2.b.l +(e2.b.r - e2.b.l) / 2, e2.b.t  + (e2.b.b - e2.b.t) / 2, xExt, yExt, e2.b);
			}
			return $g.getPath(line, xy, xyEnd);
		},
		getPattern: function(data) {
			// get pattern details for a line, which can be a compound line with several overlays to produce a patterned line.
			var pat;
			if (data.pat) {
				pat = $g.getObjects(data.pat, 'pat').l; // return predefined array of appearance overlays
				// merge any pattern overrides from 'appearance'
				if (data.a) pat.forEach(function(p,idx){$g.deepCopy(pat[idx], data.a)});
			} else {
				if (data.a) { pat = [data.a]; // return appearance layer as single elelemt array
				} else {
					pat = false;
				}
			}
			return pat;
		},
		getUid: function() {
			return 'geno'+$g.uid++;
		},
		handleFile: function(file) {
			var reader = new FileReader();
			reader.onload = function (event) {
				try {
					$g.json = $.parseJSON(event.target.result);
					$('#load').hide();
				} catch(e) {
					alert('failed to load GenoProX JSON data '+e.description);
				}
				$g.generator();
			};
			reader.readAsText(file);
			return false;
		},
		hasId: function(obj, id) {
			// check if id is in a list of ids (either an integer array or if list is a single id then just an integer) returning true or false
			return typeof obj == 'number' && obj == parseInt(id) || typeof obj == 'object' && obj.indexOf(parseInt(id)) > -1
		},
		hideObj: function(type, obj) {
			return false;
		},
		inArray: $.inArray,
		lineBoxIntersect: function (x1,y1,x2,y2,box) {
			//find intersection of line with rectangle by checking for intersect with each side
			var t,x,y,dx,dy;
			dx=x2-x1;
			if (dx!=0) { // avoid divide by zero
				t=(box.l-x1)/dx;
				y=Math.round(y1 * (1 - t) + y2 * t);
				if (t>= 0 && t <=1 && y <= box.b && y >= box.t+0) { // intersects on left side
					return {x:box.l, y:y};
				}
				t=(box.r-x1)/dx
				y= Math.round(y1 * (1 - t) + y2 * t);
				if (t>= 0 && t <=1 && y <= box.b && y >= box.t+0) { // intersects on right side
					return {x:box.r, y:y};
				}
			}
			dy = y2 - y1;
			if (dy != 0) {	// avoids divide by zero
				t=(box.t-y1)/dy;
					x= Math.round(x1 * (1 - t) + x2 * t);
				if (t>= 0 && t <=1 && x >= box.l+0 && x <= box.r) { // intersects on top side
					return {x:x, y:box.t};
				}
				t=(box.b-y1)/dy;
				x= Math.round(x1 * (1 - t) + x2 * t);
				if ((t>= 0) && (t <= 1) && (x >= box.l + 0) && (x <= box.r)) { // intersects on bottom side
					return {x:x, y:box.b};
				}
			}
		},
		loadFromURL: function(file) {
			$.ajax({
				type: "GET",
				dataType: "text",
				async: false,
				cache: false,
				url: file,
				success: function(json) {
					try {
						
						$g.json = $.parseJSON(json);
						$('#load').hide();
					} catch(e) {
					// possibly failed becuase of familytrees password protection, so ru the redirecting page again
						if (window.location.host.indexOf('familytrees') > -1 && !$g.options.again) {
							window.location = $g.options.data + 'index.htm?again=1';
						} else {
							alert('failed to load GenoProX JSON data: '+e.description);
						}
					}
					$g.generator();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('Retrieving GenoPro data as JSON, error '+textStatus+'/'+errorThrown);
				}
			});
		},
		loadingMsg: function ( strShowOrHide, opt) {
			setTimeout( function(){
				$.mobile.loading( strShowOrHide, opt );
			}, 5); 
		},
		logarg: function(arg, name) {
			console.log(name+': ', arg);
			return arg;
		},
		logit: function() {
			if ($g.options.log) {
				var now=new Date();
				if (typeof $g.timer == 'undefined') $g.timer = [now, now];
				if (arguments[0] == '@') {
					console.log('['+(now - $g.timer[0])+' (+'+(now-$g.timer[1])+')]');
					$g.timer[1] = now;
				}
				console.log.apply(console,arguments);
				if ($g.options.debug && confirm(arguments[0])) debugger;
			}
		},
		mapInit: function (mapId) {
			$g.mapId = mapId;
			if (!$g.alldates) {
				$g.alldates = [-9999,9999];
				$.each($g.json.map, function(id,map){$g.getMapDates(id, map);});
			}
			var dates = mapId == 'all' ? $g.alldates : $g.json.map[mapId].alldates;
			
			var slider = 	$g.slider = document.getElementById('dateslider');
			if (slider.noUiSlider) slider.noUiSlider.destroy();
			noUiSlider.create(slider, {
				connect: true,
				start: [-9999,9999 ],
				range: {
					'min': [ -9999, dates[0] + 9999 ], // step from beginning (-9999 or 9999 BCE) to lowest evnt date
					'1%': [ dates[0], 1],
					'99%': [ dates[1], 1 ],
					'max': [ 9999, 9999 - dates[1]]
				},
				format:{to:function(value){return value}, from:function(value){return value}},
				tooltips: // add BCE suffix (BCE = 'before common era' a.k.a. BC) if negative date
					[{to: function(value) {
							return Math.abs(Math.round(parseInt(value))) + (value < 0 ? String.fromCharCode(160)+'BCE' : '');
						}
					},
					{to: function(value) {
							return Math.abs(Math.round(parseInt(value))) + (value < 0 ? String.fromCharCode(160)+'BCE' : '');
						}
					}
					]
			});
			$('body').pagecontainer('change', '#map', {"allowSamePageTransition":true});
			
		},
		normalizeDate: function(date) { //todo
			return date;
		},
		otherEvents: function(events, test) {
			// check for 'non-standard' events, returning either list of keys of such events or just true/false if 'test' is true.
			var others=[];
			if (events) {
				for (val in events) {
					if (events.hasOwnProperty(val) && !$g.standardEvents.includes(val)) {
						others.push(val);
						if (test) break;			// stop now if just testing if other events present
					}
				};
			}
			return test ? others.length : others;
		},
		parseDates: function(jsondate, justYears) {
			// return dates from json data (2 element date string array or single date string) as a 2 element signed integer array 
			var date = jsondate instanceof Array ? jsondate.slice() : [jsondate,jsondate],
				days = ['','31','29','31','30','31','30','31','31','30','31','30','31'],
				sign = '';
			if (date[0]) {
				if (justYears) {
					date[0] = date[0].match(/\-/) + (date[0].match(/\d{4}/)[0]); // ignore any approximation prefix (<~>)
				} else {
					date[0] = date[0].match(/\-/) + (date[0].match(/\d+/)[0]+'0101').substr(0,8); // ignore any approximation prefix (<~>)
				}
			}
			if (date[1]) {
				sign = /\-/.test(date[1]) ? '-' : '';
				if (justYears) {
					date[1] = date[1].match(/\d{4}/)[0];
				} else {
					date[1] = date[1].match(/\d+/)[0];
					if (date[1].length != 8) date[1] = date[1].length == 4 ? date[1]+'1231' : date[1]+days[Number(date[1].substr(4,2))];
				}
				date[1] = sign + date[1];
			}
			return [date[0], date[1]];
		},
		parseMarkup: function($0, $1, token, text) {
			// deal with any Custom Markup in text , i.e. with format <?token arguments ?> 
			//
			// ** With thanks and credit to Peter Theony http://twiki.org/cgi-bin/view/Blog/BlogEntry201109x3 **
			//
			var level = 0;
			// initialise by adding level numbers to delimiters ( <? and ?>  become  <n? and ?n>  e.g. <1? and ?1> .  
			if (token=='init') text = text.replace(/((\<\?)|(\?\>))/gm, function(m) {return  (m == "<?" ? "<"+(++level)+"?" : "?"+(level--)+">");});

			// recursively call myself to deal with nesting and process tokens
			text = text.replace(/\<([0-9]+)\?([A-Z]+) *((.|\n)*?)\?\1\>/gim, $g.parseMarkup);
            /*                    \_________/\______/  \___/     \___/
			                         |          |        |         |
		    above we have:   1st delimiter  token   text(greedy)  delimiter at same level as 1st (back reference \1)
			*/	
			switch (token) {
			case "email" :
/* dev @/
			case "mail" :
				var parts = text.trim().split(' ');
				if (parts.length -=1 ) {
					var bits = parts[0].split('\\');
					return '\1\2<a href=\"mailto:\1'+bits[0].trim()+'\1\2>\1'+(bits[1] ? bits[1] : bits[0])+'\1\2</a>';
				} else {
					return '\1'text;
				};break
				case "image" :		// <?image "path"|id[ width height]?>
					var parts = text.trim().match(/((".*")|(\w+))( +(\d+))?( +(\d+))?/);
					if (parts.length) {
						var path = parts[2] | $g.getImgPath(parts[3]);
						return '\1\2<div class="customimage"><img src='+path+(parts[5] ? ' "width='+parts[5]+'"' : '') + parts[7] ? ' "height='+parts[7]+'"' : '')+'\1\2/>'
                                "<img src=
//										*/
				case "hide" :
					return '\1\3'+text; break;
				case "html" :
					return '\1\2'+text; break;
				case "init" :
					return text; break;
				case "section" :			//   <?section subheading\text\markup for this section"?>  N.B. REPLACES subsection
					var subhead = text.substr(0,text.indexOf("\\")).trim();
					return "\1\2<div data-role=\"collapsible\""+(subhead.substr(-1)=="+" ? " data-collapsed=\"false\"" : '')+"><h2>\1" + subhead.replace(/\+$/,'')+"\1\2</h2><span>\1"+text.substr(subhead.length+1).trim()+"\1\2</span></div>\1"; break;
                case "subsection" :         //   <?subsection "subheading" "text for this subsection"?> !!DEPRECATED!! 
                    var bits = text.trim().split("\"");
                    return "\1\2<div data-role=\"collapsible\"><h2>" + bits[1]+"</h2>"+"<span>"+bits[3]+"</span></div>\1"; break;
				case "url" :				//   <?url http://www.example.com\example website ?>
					var bits = (text.trim() + "\\").split("\\");
					return "\1\2<a href='" + bits[0] + "' target='_blank'>"+ (bits[1] ? bits[1] : bits[0]) + "\1\2</a>\1"; break;
				case "text" :
				case "off" :
					return '\1'+text; break;
				default :
					return "!"+token+"!=\1\2"+ text.trim()+'\1';
			}
		},
		parseText: function(text, firstline) {
			// deal with any newlines and custom markup in text plus option to return only first line of text (Used for Social Entity 'title')
			if (firstline) return $g.parseMarkup('','', 'init', text).split('\n')[0];
			// check for multilingual text custom markup
			if (text.indexOf('{?') > -1) text = text.replace(/(\{\?)([A-Z]{2}:[^\}]*)\}/,'{¿\2¿}');  // convert type 2 multilingual text to type 1	
			if (text.indexOf('{¿') > -1) {
				// generate HTML to allow hiding/showing of each translation 
				text = text.replace(/\{¿([A-Z]{2}):(([^¿]|¿[^\}])*)¿\}/g, function(match,$1,$2) {
					return '\1\2<span class="langcode" onclick="javascript:$g.toggleLang(this);" title="'+$g.dic($1,"Language")+'"><u>'+$1+'</u> </span><span ' + ($g.options.lang && $g.options.lang != $1 ? ' style="display: none;"' : '') + '>\1'+$2 + '\1\2</span>'
				});
			}
			var result='', skip = false;
			$g.parseMarkup('','', 'init', text).split('\1').forEach(function(str) {
				if (!skip) {
					switch (str.substr(0,1)) {
					case '\2' :							// no HTML encoding
						result += str.substr(1).replace(/\n/g, '<br/>'); break;
					case '\3' :							// hide rest of string
						skip = true; break;
					default :							// HTML encode
						result += str.replace(/[\x26<>'"]/g, function(c){return"&#"+c.charCodeAt(0)+";"}).replace(/\n/g, '<br/>'); break;
					}
				}
			});
			return result;
		},
		popupResize: function() {
		    $( "#popuppage" ).on({
		        popupbeforeposition: function() {
		            var maxHeight = $( window ).height() - 60 + "px";
		            $( "#popuppage img" ).css( "max-height", maxHeight );
		        }
		    });
		},
		render: function(tmpl, group, contextRender, contextDic) {
			if (!$.render[tmpl]) {
				// if not already registered first compile and register the JSRender template
				// getting templare source from i18next translation via $g.dic
				$.templates(tmpl, $g.dic(tmpl, group, contextDic))
			}
			// render template and return it
			return $.render[tmpl](contextRender);
		},
		s2a: function(text) {return (text ? text.split('\n') : null);},
		scaleContentToDevice: function (selector){
			scroll(0, 0);
			var content = $.mobile.getScreenHeight() - $(".ui-header").outerHeight() - $(".ui-footer").outerHeight() - $('.ui-content').outerHeight() + $('.ui-content').height();
			$(selector).height(content);
		},		
		show: {
			atree: function() {
				$('#ancestorspage').html($.render.ancestors($g.obj,{myID: $g.obj._id, myGender: ($g.obj.g || 'U'), color:true}));
				$('body').pagecontainer('change', '#ancestorspage', {"allowSamePageTransition":true});
			},
			chart: function (chartID) {
				/* Load the data for a specific chart, based on
				// the URL passed in. Generate svg for the items in the
				// chart, inject it into an embedded page, and then make
				// that page the current active page.*/
				//$g.loadingMsg( 'show', { theme: "b", text: "loading chart "+chartID, textVisible: true });
				$g.markers={};
				$('#def_'+chartID).html($.render.defs(chartID,{underlay: $('.ui-overlay-a').css('background-color')}));
				$('#g_'+chartID).html($.render.chart($g.json.map[chartID],{chart: chartID, underlay: $('.ui-overlay-a').css('background-color')}));
				//$('div#cha_'+chartID+' svg').get(0).setAttribute('viewBox', '0 0 '+$(window).width()+' '+($(window).height() - 100));
			},
			dtree: function() {
				$('#descendantspage').html($.render.descendants($g.obj,{myID: ''+$g.obj._id, myGender: ($g.obj.g || 'U'), color:true}));
				$('body').pagecontainer('change', '#descendantspage', {"allowSamePageTransition":true});
			},
			ind: function (id) {
				var ind = $g.obj = $g.json.ind[id], json={events:[]};
				if (ind.evt) { //some 'life events' are present so try and build a timeline
					$g.getEvents(ind.evt);
				};
				$('#detailpage').html($.render.detail(ind, {myID: ''+id, myGender: (ind.g || 'U')})).enhanceWithin();

				//if (json.events.length > 1) $g.timeline(json);
				//$('#detailpage').enhanceWithin();
				$('#detailset').collapsibleset();
				$g.popupResize();
				$('body').pagecontainer('change', '#detailpage', {"allowSamePageTransition":true});
			},
			indFromChart: function (id) {
				var obj = $g.json.map[$g.currentChart]['obj'][id];
				if (obj.data && obj.data.ind) $g.show.ind(obj.data.ind);
			},
			map: function (chart, type, chartid, basedates) {
				// deal with Google Map place markers and heatmaps for births, deaths or all events.
				
				var dates = basedates, slidedates = $g.slider.noUiSlider.get();
				var filter = slidedates[0] !== -9999 || slidedates[1] !== 9999;
				
				// if date filtering applied get current slider values
				
				if (filter) {
					dates[0] = slidedates[0];
					dates[1] = slidedates[1];
				}

				// add markers for each geo-coded place in this GenoMap chart to exisiting Google Map
				$.each(chart.pla, function(idx, id){
					id+='';
					var pla = $g.getObjects(id,'pla');
					if ((pla.l && !filter) ||
						(pla.l && (dates && chart.dates && chart.dates[id] && ((chart.dates[id][0] >= dates[0] && chart.dates[id][0] <= dates[1]) ||	
									(chart.dates[id][1] >= dates[0] && chart.dates[id][1] <= dates[1]))))) {
						var loc = pla.l.split(',');
						switch (type) {
						case 'pla':
							var position = new google.maps.LatLng(loc[0],loc[1]);
							$g.gbounds.extend(position);
							marker = new google.maps.Marker({position: position,map: $g.gmap,title: pla.name});
							google.maps.event.addListener(marker, 'click', (function(marker, pla) {
								return function() {
									$g.ginfowin.setContent($.render.eventlist(pla, {filter: filter, chart:chartid, dates: dates}));
									$g.ginfowin.open($g.gmap, marker);
								}
							})(marker, pla));
							$g.gmarkers.push(marker);
							$g.gmarkers.visible = true;
							break;

						default:
							var cnt=0;
							$.each(pla.evt, function(key, evts) {
								if (type == 'all' || key == type) cnt+=evts.length;});
							if (cnt>0) {
								if($g.hotcounts[id]) {
									$g.hotcounts[id] += cnt;
								} else {
									$g.hotcounts[id] = cnt;
								}
							}
						}
					}
				});
			},
			maps: function(mapId, type) {
				// clear any previous markers from the map
				if ($g.gmarkers && $g.gmarkers.visible) {
					$g.gmarkers.forEach(function(mkr){mkr.setMap(null)}); 
					$g.gmarkers.visible = false;
				}
				$g.gmarkers = [];
				$g.hotspots = [];
				$g.hotcounts = {};

				if (type == 'pla') {
					$g.heatmap.setMap(null);
				} else {
					var zoom = $g.gmap.getZoom();
				}
				if (mapId == 'all' ) {
					$.each($g.json.map, function(id, map){$g.show.map(map, type, id, $g.alldates);})
				} else {
					$g.show.map($g.json.map[mapId], type, mapId, $g.json.map[mapId].alldates);
				}
				if (type == 'pla') {
					$g.gmap.fitBounds($g.gbounds);
				} else {
					$.each($g.hotcounts, function(id, cnt) {
						var pla = $g.json.pla[id];
						var loc = pla.l.split(',');
						if (cnt>0) $g.hotspots.push({location:new  google.maps.LatLng(loc[0],loc[1]), weight: 1});
					});
					$g.heatmap.setMap($g.gmap); 
					$g.heatmap.setData($g.hotspots);
					$g.gmap.setZoom(zoom);
					zoom = $g.gmap.getZoom();
				}
			},
			org: function (id) {
				var org = $g.json.org[id];
				$('#org').html($.render.org(org, {myID: ''+id})).enhanceWithin();
				$g.popupResize();
				$('body').pagecontainer('change', '#org', {"allowSamePageTransition":true});
			},
			photo: function(pics,id,type) {
				if (id) {pics=$g.getObjects(id, type).mm.pic;}
				var path, paths = [], pic = pics ? $g.getObjects(pics, 'mm') : $g.getObjects($g.obj.mm._pic, 'mm'); 
				if (!pic.length) pic = [pic];
				for (i=0; i < pic.length; i++) {
					paths.push(pic[i].path);
				}
				$.prettyPhoto.open(paths);
			},
			pla: function (id) {
				var pla = $g.json.pla[id];
				$('#place').html($.render.place(pla, {myID: id})).enhanceWithin();
				if (pla.l) {
					$g.gmapData = $g.getMapData(pla.l.split(','), pla.disp || {});
				} else {
					$g.gmapData = null;
				}
				$g.popupResize();
				$('body').pagecontainer('change', '#place', {"allowSamePageTransition":true});
			},
			relate: function() {
				if (!$g.relate) {
					$g.relate = $g.obj._id;
					// toggle icon theme and tooltip to indicate selected
					$("#iconrelate").hide();
					$("#iconrelate1").show().trigger('mouseOver');
				} else {
					if ($g.relate == $g.obj._id) {
					// toggle icon theme and tooltip to indicate deselected
					$("#iconrelate1").hide();
					$("#iconrelate").show().trigger('mouseOver');
						$g.relate = null;
						return;
					} else {
						// look for kinship between the two selected individuals
						function growTree(myTree, yourTree, me, myFamilyID, myChildID, myChildIndex, height, matches, flipTree) {
							/* this function is called recursively to build 'myTree' object with each entry having :
								{id: [{height:val, fam: val, child: val, child_index: val}]}
									id - ID of individual, each id entry can have multiple sets of the following items as the individual may be reached by more thsn one path up the tree.
											fam:  id of biological family of individual
											child: id of child via whom we arrived at this individual
											child_index: 
							*/
							if (me) {
								var fam, matchFound = false, spouse, tmp; 
								matchFound = addBranch(String(me._id), myTree, yourTree, height, myFamilyID, myChildID, myChildIndex, flipTree)
								if (height == 0 && me.fam && me.fam.length) {		// add any spouses so that partners are matched too.
									$g.getObjects(me.fam,'fam').forEach(function(fam,idx) {
										if (fam._p) {
											$g.getObjects(fam._p, 'ind', me._id).forEach(function(spouse) {
												matchFound = addBranch(String(spouse._id), myTree, yourTree, height, String(fam._id), null, 0, flipTree) && matchFound;
											});
										}
									});
								}
								// continue on up the parents trees if no match found
								if (me.bio && !matchFound) {
									$g.getObjects(me.bio,'fam').forEach(function(fam,idx) {
										if (fam._p) {
											$g.getObjects(fam._p, 'ind').forEach(function(parent) {
												growTree(myTree, yourTree, parent, String(fam._id), String(me._id), myTree[me._id].length-1, height+1, matches, flipTree);
											});
										}
									});
								}
							}
							return null;
						}
						function addBranch(myID, myTree, yourTree, height, myFamilyID, myChildID, myChildIndex, flipTree) { 
							var myChildID, yourChildID, matchFound = false, myIndex, yourIndex, yourChildIndex, tmp;
							if (!myTree[myID]) myTree[myID]=[];
							myTree[myID].push({height:height, fam: myFamilyID, child: myChildID, child_index: myChildIndex});
							if (yourTree[myID]) {				// there is a match in the other tree for this id
								$g.debug();
								myIndex = myTree[myID].length-1;
								for (yourIndex=0; yourIndex<yourTree[myID].length; yourIndex++) {
									yourChildID = yourTree[myID][yourIndex].child;
									yourFamilyID = yourTree[myID][yourIndex].fam;
									yourChildIndex = yourTree[myID][yourIndex].child_index;
									// ignore matches on parents and duplicates of a previous match as we are only interested in lowest common ancestor
									if ((!myChildID || !yourChildID || (myChildID !== yourChildID)) && !(matched[myFamilyID+'_'+myChildID] && matched[yourFamilyID+'_'+yourChildID])) { 
										if (!matches) matches = {};
										if (!matches[myID]) matches[myID]=[];
										// keep order of offsets to matched object consistent i.e. 1st ind's tree then 2nd ind's tree 
										// even when growTree called with tree params reversed)
										tmp = !flipTree ? matches[myID].push({bio: myFamilyID == yourFamilyID, index:myIndex, your_index:yourIndex}) : matches[myID].push({bio: myFamilyID == yourFamilyID, index:yourIndex, your_index:myIndex});
										matched[myFamilyID+'_'+myChildID] = true;
										matched[yourFamilyID+'_'+yourChildID] = true;
										matchFound = true;
									}
								}
							}
							return matchFound;
						}
						function logAndPrintMatch(id, results, count)	{
							var temp,   ind, param={}, sGender, sMsg='';
							//ind = results.a.tree[id][results.a.index].ind;
							
							param.deptha = results.a.tree[id][results.a.index].height;
							param.depthb = results.b.tree[id][results.b.index].height;
							
							param.inlawa = param.deptha > 999 || (param.depthb > 999 && param.deptha === 0);
							param.inlawb = param.depthb > 999 || (param.deptha > 999 && param.depthb === 0);
							
							param.deptha = param.deptha % 1000;
							param.depthb = param.depthb % 1000;

							if (param.deptha <  param.depthb) {
								// swap details if reqd to ensure younger (in terms of generations) individual is Ind1 
								results.a.ind = [results.b.ind, results.b.ind = results.a.ind][0];
								results.a.tree = [results.b.tree, results.b.tree = results.a.tree][0];
								results.a.index = [results.b.index, results.b.index = results.a.index][0];
								param.deptha = results.a.tree[id][results.a.index].height % 1000;
								param.depthb = results.b.tree[id][results.b.index].height % 1000;
							}

							if (results.a.tree[id][results.a.index][0] >= 1000 || results.b.tree[id][results.b.index][0] >= 1000) results.suffix = '-in-law';
							iDiff =  param.deptha - param.depthb;
							results.a.famId = results.a.tree[id][results.a.index].fam;
							results.b.famId = results.b.tree[id][results.b.index].fam;
							if (! results.b.famId) results.b.famId = results.a.famId;
							if (results.a.famId != results.b.famId ) param.prefix = param.depthb == 0 ? 'Step' : 'half-'; // Family of common ancestor differs

							var indA=results.a.ind, indB = results.b.ind, famA, famB, mate1=null, mate2=null, sMate1='', sMate2='',  sGenderA, sGenderB;
							if (param.deptha > 0) {				// not husband and wife
								if (results.a.tree[id][results.a.index].height >= 1000) {
									mate1 = results.a.ind;
									sMate1 = results.a.ind + '';
									famA = $g.getObjects(results.a.famId, 'fam');
									indA = $g.getObjects(famA._p, 'ind', results.a.ind);
								}
								if (results.b.tree[id][results.b.index].height >= 1000) {
									mate2 = results.b.ind;
									sMate2 = results.b.ind + '';
									famB = $g.getObjects(results.b.famId, 'fam');
									indB = $g.getObjects(famB._p, 'ind', results.b.ind);
								}
							}
							sGenderA = indA.g || 'U';
							sGenderB = indB.g || 'U';
							param.prefix = param.prefix || '';
							param.suffix = param.suffix || '';
							param.count = count;
							param.id = id;
							param.targeta = results.a.ind._id;
							param.targetb = results.b.ind._id;
							// now generate actual relationship details
							$('#relate').append($.render.relate(results, {"p": param}));
						}
						
						var tree1={}, tree2={},  matches = null, matched = {}, ind1 = $g.getObjects($g.relate, 'ind'), ind2=$g.getObjects($g.obj._id, 'ind');
						// store ancestors of 1st Individual
						growTree(tree1, tree2, ind1, null, null, 0, 0, matches);
						// store ancestors of 2nd Individual until match if any.
						growTree(tree2, tree1, ind2, null, null, 0, 0, matches, true);
						// now look into ancestors on in-law side. we indicate this type of search by adding 1000 to 'height' value for each spouse
							// try all spouses of Ind1 but exclude ind2
						if (ind1.fam) $g.getObjects(ind1.fam,'fam').forEach(function(fam,idx) {
							$g.getObjects(fam._p,'ind',[ind1._id, ind2._id]).forEach(function(spouse, idx2) {
								growTree(tree1, tree2, spouse, String(fam._id), null, 0, (idx*10+idx2+1)*1000, matches);
							});
						});
						// try all spouses of Ind2
						if (ind2.fam) $g.getObjects(ind2.fam,'fam').forEach(function(fam,idx) {
							$g.getObjects(fam._p,'ind',[ind1._id, ind2._id]).forEach(function(spouse, idx2) {
								growTree(tree2, tree1, spouse, String(fam._id), null, 0, (idx*10+idx2+1)*1000, matches, true);
							});
						});
						// no report if no blood relation and not in-laws
						if (!matches) {
							alert('no relation found');
						} else {
							$('#relate').html('');	// clear any previous results
							var m=0;
							for (id in matches) {
								if (matches.hasOwnProperty(id)) {
									var imin=0, imax=matches[id].length-1
									// if >1 match for same id, only report biological match if any
									if (imax > 1)
									for (var j=0; j <= imax; j++) {if (matches[id][j].bio) {imin=imax=j; break}}
									for (var i=imin; i <= imax; i++) {
										logAndPrintMatch(id, {a:{ind:ind1, tree:tree1, index: matches[id][i].index},b:{ind:ind2,tree:tree2, index:matches[id][i].your_index}}, ++m);
									}
								}
							}
							$('body').pagecontainer('change', '#relate', {"allowSamePageTransition":true});
						}
					}
					$g.relate = null;
				}
			},
			src: function (id) {
				var src = $g.json.src[id];
				$('#source').html($.render.source(src, {myID: ''+id})).enhanceWithin();
				$g.popupResize();
				$('body').pagecontainer('change', '#source', {"allowSamePageTransition":true});
			},
			timeline: function(json) {
				// two arguments: the id of the Timeline container (no '#')
				// and the URL to your JSON data file. In this case, a relative URL.
				window.timeline = new VCO.Timeline('timeline-embed', new VCO.TimelineConfig(json));

				// You probably also want to ensure that the timeline redraws 
				// when the window is resized. We may eventually make this the default behavior.
				window.onresize = function(event) {
					timeline.updateDisplay();
				}
			}
		},
		start: function () {
			$('div[data-role="header"], div[data-role="footer"]').css('visibility','visible');
			if ($g.jsonLoaded) {
				$g.generator();
			} else if ($g.options.file){
				var holder = document.getElementById('holder');
				holder.ondragover = function () { this.className = 'hover'; return false; };
				holder.ondragend = function () { this.className = ''; return false; };
				holder.ondrop = function (e) {
				  this.className = '';
				  e.preventDefault();
				  $g.handleFile(e.dataTransfer.files[0]);
				};
				$('body').pagecontainer('change', '#load', {'allowSamePageTransition':true})
			} else {
				alert('No json data specified');
				window.close();
			}
		},
		toggleLang: function(tag) {
			// where narrative text has muultiple language sections, toggle the associated text when language code is clicked
			tag.nextSibling.style.display = (tag.nextSibling.style.display == 'none' ? 'inline' : 'none');
		}
	};
})(this);    // END CLOSURE

	// jsrender global helpers and settings
	$.views.converters("dic", function(key,group,options) {return $g.dic(key, group, options);});
	$.views.helpers({g: $g, i18n: i18next});
	$.views.settings.delimiters("{%", "%}");
	// create some custom jsrender tags to simplify templates
	$.views.tags({
		box: {
			template:
				// args 0=subheading 1=value 2=html?
				"<div class='ui-body ui-body-a ui-corner-all'><table>" +
					"<tr>" +
						"{%if ~tag.tagCtx.args[0]%}<td>{%>~tag.tagCtx.args[0]%}</td>{%/if%}" +
						"<td {%if !~tag.tagCtx.args[0]%}class='solo'{%/if%}>{%if ~tag.tagCtx.args[2]%}{%:~tag.tagCtx.args[1]%}{%else%}{%>~tag.tagCtx.args[1]%}{%/if%}</td>" +
					"</tr>" +
				"</table></div>"
		},
		icon: {
			// add link with icon to invoke other pages
			template:
				// args 0==flag type
				"<a data-role='button'  data-iconpos='notext' data-inline='true'" +
				"{%if ~tag.tagCtx.args[0] == 'map'%}" +
					// args  0='map' 1=map id 2=map object id
					"href='#cha_{%:~tag.tagCtx.args[1]%}?obj='{%:~tag.tagCtx.args[3]%}' data-icon='{%:~g.icons[~tag.tagCtx.args[0]]%}' title='{%>~g.dic(~tag.tagCtx.args[0],'Icons')%}: {%>~g.json.map[~tag.tagCtx.args[1]].t%}'>"+
				"{%else ~tag.tagCtx.args[0] == 'photo'%}"+
					// arg 0='atree'|'dtree'|'relate' 1=extra tooltip text
					"href='#' id='icon{%:~tag.tagCtx.args[0]%}' onclick='$g.show.{%:~tag.tagCtx.args[0]%}(undefined, {%:~tag.tagCtx.args[1]%},\"ind\");'  data-theme='a' data-icon='{%:~g.icons[~tag.tagCtx.args[0]]%}' title='{%>~g.dic(~tag.tagCtx.args[0],'Icons')%}'>" +
				"{%else%}"+
					// arg 0='atree'|'dtree'|'relate' 1=extra tooltip text
					"href='#' id='icon{%:~tag.tagCtx.args[0]%}' onclick='$g.show.{%:~tag.tagCtx.args[0]%}();' data-theme='a' data-icon='{%:~g.icons[~tag.tagCtx.args[0]]%}' title='{%>~g.dic(~tag.tagCtx.args[0],'Icons')%} {%>~tag.tagCtx.args[1] || ''%}'>" +
					"{%if ~tag.tagCtx.args[0] == 'relate'%}" +
						"placeholder for tooltip</a><a data-role='button'  data-iconpos='notext' data-inline='true'" +
						"href='#' id='iconrelate1' onclick='$g.show.relate();' data-theme='a' data-icon='check' title='{%>~g.dic('unrelate','Icons')%} {%>~tag.tagCtx.args[1] || ''%}' style='display: none;'>" +
					"{%/if%}"+
				"{%/if%}placeholder for tooltip</a>"
		},
		frame: {
			// place rounded cornered frame around nested content
			template:
				"<div class='ui-body ui-body-a ui-corner-all'>" +
					"{%include tmpl=~tag.tagCtx.content /%}" +
				"</div>"
		},
		line: {
			template:
				// args 0=subheading 1=value 2=html?
				"<tr><td>{%>~tag.tagCtx.args[0]%}</td><td>{%if ~tag.tagCtx.args[2]%}{%:~tag.tagCtx.args[1]%}{%else%}{%>~tag.tagCtx.args[1]%}{%/if%}</td></tr>"
		},
		lineb: {
			template:
				// args 0=#data 1=subheading 2=optional extra html
				"<tr><td>{%>~tag.tagCtx.args[1]%}{%if ~tag.tagCtx.args[2]%} {%:~tag.tagCtx.args[2]%}{%/if%}</td><td>{%include tmpl=~tag.tagCtx.content /%}</td></tr>"
		},
		range: {
			boundProps: ["start", "end"],

			// Inherit from {{for}} tag
			baseTag: "for",

			// Override the render method of {{for}}
			render: function(val) {
			  var array = val,
				tagCtx = this.tagCtx,
				start = tagCtx.props.start || 0,
				end = tagCtx.props.end,
				props = tagCtx.params.props;

			  if (start || end) {
				if (!tagCtx.args.length) { // No array argument passed from tag, so create
										   // a computed array of integers from start to end

				  array = [];
				  end = end || 0;
				  for (var i = start; i <= end; i++) {
					array.push(i);
				  }
				} else if ($.isArray(array)) { // There is an array argument and start and end
						 // properties,so render using the array truncated to the chosen range
				  array = array.slice(start, end);
				}
		  }

		  // Call the {{for}} baseTag render method
		  return arguments.length || props && (props.start || props.end)
			? this.base(array)
			: this.base(); // Final {{else}} tag, so call base() without arguments, for
						   // final {{else}} of base {{for}} tag
		},

		// override onArrayChange of the {{for}} tag implementation
		onArrayChange: function(ev, eventArgs) {
		  this.refresh();
		}
		},
		section: {
			// create a collapsible section with heading
			template:
				// args 0=#data 1=id 2=heading 3=collapsed (true/false) 4= _pics (array of picture ids)
				"<div data-role='collapsible' id='{%>~tag.tagCtx.args[1]%}' class='optional'" +
				"{%if !~tag.tagCtx.args[3]%} data-collapsed='false'{%/if%}>" +
					"<h4>{%>~tag.tagCtx.args[2]%}"+
					"{%if ~tag.tagCtx.args[4]%} <a href=\"#\" onclick=\"$g.show.photo([{%:~tag.tagCtx.args[4].toString()%}])\" title=\"{%>~g.dic('Slideshow')%}\"><img class=\"pix\"  src=\"../../Apps/Genotab/images/photo.gif\"/></a>{%/if%}"+
					"</h4>" +
					"{%include tmpl=~tag.tagCtx.content/%}" +
				"</div>"
		},
		table: {
			template: 
				// args 0=#data 1=number or false/0 2=box header title 3=box header detail text (optional) 4=box header detail via template(optional) 5=optional pictures
				"<table>" +
				"{%if ~tag.tagCtx.args.length > 1%}" +
					"<thead><tr><th colspan='2'>" +
						"{%if ~tag.tagCtx.args[1]%}{%>~tag.tagCtx.args[1]%}. {%/if%}{%>~tag.tagCtx.args[2]%}" +
						"{%if ~tag.tagCtx.args[5]%} <a href=\"#\" onclick=\"$g.show.photo([{%>~tag.tagCtx.args[5].toString()%}])\"><img src=\"../../Apps/GenoTab/images/photo.gif\"/></a>{%/if%}" +
						"{%if ~tag.tagCtx.args[3]%} {%>~tag.tagCtx.args[3]%}{%/if%}" +
						"{%if ~tag.tagCtx.args[4]%}{%include tmpl=~tag.tagCtx.args[4] /%}{%/if%}" +
					"</th></tr></thead>" +
				"{%/if%}" +
				"<tbody>" +
					"{%include tmpl=~tag.tagCtx.content /%}" +
				"</tbody></table>"
		}
	});
	
// Initialise
$(document).ready(function () {
	// parse query string parameters into $g.options
	document.location.search.replace(/([^?=&]+)(=([^&#]*))?/g, function($0, $1, $2, $3) {$g.options[$1] = $3;});

	if ($g.options.debug) $g.options.log = true;
	
	$g.options.lang = $g.options.lang || (navigator.languages ? navigator.languages[0] : navigator.language || navigator.systemLanguage).substring(0,2).toUpperCase();
	
	console.log('jQuery version: ' + $.fn.jquery);
	console.log('Hammer version: ' + Hammer.VERSION);
	
	// initialise error handling
	if (window.addEventListener) {
		document.querySelector(".modal-close-button").addEventListener("click", function() {document.querySelector(".modal").classList.toggle("show-modal");});
		window.addEventListener("click", function (event) {if (event.target === document.querySelector(".modal")) document.querySelector(".modal").classList.toggle("show-modal");});
		window.addEventListener('error',
			function (e) {
				console.log(e);
				if (e.error && e.error.stack) var stack = (e.error.stack).replace(/http\:\/\/familytrees\.genopro\.com\/Apps\//g,'').replace(/http\:\/\/127\.0\.0\.1\/Apps\//g,'');
				var message = '!!! '+(e.error.name || 'Error: ') + (e.error.number || '')+ ' ' + e.error.message;
				console.log(message + (('\n'+stack) || ''));
				document.getElementById('modal-errortxt').innerHTML=message + (('<br>'+stack) || '');
				document.querySelector(".modal").classList.toggle("show-modal");
			}
		)
	}

	
	// Initialiase prettyPhoto;
	$("a[rel^='prettyPhoto']").prettyPhoto({deeplinking: false, allow_expand: false, social_tools: false});
	
	// compile jsrender templates by using jquery to find script blocks, use jquery's get() to convert to array and  javascript reduce
	// to build object for jsrender 'templates' param. 
	// N.B. Script block's id must be set to required template name with an underscore appended
	//
	$.templates($('script[type="text/x-jsrender"]').get().reduce(function(tmpl,scr){tmpl[(scr.id).slice(0,-1)]='#'+scr.id;return tmpl;},{}))
	
	// dynamically add css rules to set alternate colours for table rows using colours from jqm theme
    var css, head = document.head || document.getElementsByTagName('head')[0], style = document.createElement('style');
	style.type = 'text/css';
	css = 'td+td { background-color: '+$('.ui-overlay-a').css('background-color')+'; }';
	if (style.styleSheet){style.styleSheet.cssText = css;} else {style.appendChild(document.createTextNode(css));}
	head.appendChild(style);
	
	$(function(){
		$( "[data-role='header'], [data-role='footer']" ).toolbar({ theme: "a" });
	});
	
	$('#floating-panel').drags();
	
	$g.eventsHandler = {
	  haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel']
	, init: function(options) {
		var instance = options.instance
		  , initialScale = 1
		  , pannedX = 0
		  , pannedY = 0
		// Init Hammer
		// Listen only for pointer and touch events
		this.hammer = Hammer(options.svgElement, {
		  inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
		})
		// Enable pinch
		this.hammer.get('pinch').set({enable: true})
		// Handle pan
		this.hammer.on('panstart panmove', function(ev){
		  // On pan start reset panned variables
		  if (ev.type === 'panstart') {
			pannedX = 0
			pannedY = 0
		  }
		  // Pan only the difference
		  instance.panBy({x: ev.deltaX - pannedX, y: ev.deltaY - pannedY})
		  pannedX = ev.deltaX
		  pannedY = ev.deltaY
		})
		// Handle pinch
		this.hammer.on('pinchstart pinchmove', function(ev){
		  // On pinch start remember initial zoom
		  if (ev.type === 'pinchstart') {
			initialScale = instance.getZoom()
			instance.zoom(initialScale * ev.scale)
		  }
		  instance.zoom(initialScale * ev.scale)
		})
		// Prevent moving the page on some devices when panning over SVG
		options.svgElement.addEventListener('touchmove', function(e){ e.preventDefault(); });
	  }
	, destroy: function(){
		this.hammer.destroy()
	  }
	}
	
	// handle jqm page changes 
	$("body").on("pagecontainerbeforechange", function(event, data) {
		//# if ($g.options.log) $g.logit("pagecontainterbeforechange", data, event);
		if ( typeof (data.toPage) == "string") {
			   if (data.toPage.indexOf("#") == -1 && typeof data.options.fromPage[0].id == "string") event.preventDefault();         
		   }      
	});
	$("body").on("pagecontainerchange", function (event, ui) {
		var page = $.mobile.pageContainer.pagecontainer('getActivePage').attr('id'), timer;
		if (page.search(/^cha_/) !== -1) {  
			var chartID = page.substr(4);
			$g.currentChart = chartID;
			// get genomap object id from URL querystring if present
			var obj = (ui.absUrl.split('#')[1]+'?=').split('?')[1].split('=')[1];

			if (!$('#' + chartID + ' > svg g g')[0]) { // no svg
				// if first visit to this page load svg chart/tree using jsrender (via $g.show,chart)
				$g.show.chart(chartID);
				$g.maps[chartID].panZoom = svgPanZoom('div#'+page+' svg', {
					zoomEnabled: true,
					minZoom: 0.1,
					dblClickZoomEnabled: true,
					controlIconsEnabled: true,
					contain: 1,
					//center: 1,
					customEventsHandler: $g.eventsHandler
				});
			} else { 
				// if subsequent visit to same page the resize in case size/orientation changed since last viewed.
				$(window).resize(); 
			}
			var highlight = $('#g_' + chartID + ' #highlight circle')
			if (obj) {
				// if genomap obj id passed in url querystring, pan to that object on the genomap
				obj = $g.json.map[chartID].obj[obj];
				var tmp = $g.maps[chartID].panZoom.getSizes();
				//$g.maps[chartID].panZoom.zoom(2);
				//$g.maps[chartID].panZoom.pan({x:tmp.width/2-obj.x, y:tmp.height/2-obj.y});
				$(highlight).attr({cx: obj.x, cy: obj.y, visibility: 'visible'});
			} else {
				// otherwise fit svg to screen
				var tmp = $g.maps[chartID].panZoom.getSizes();
				//$g.maps[chartID].panZoom.resize();
				$g.maps[chartID].panZoom.fit();
				//$g.maps[chartID].panZoom.center();
				$(highlight).attr('visibility', 'hidden');
			}
		} else if (page == 'map') {
			$g.scaleContentToDevice('#canvas');
			if (!$g.gmap) {
				$g.gmap = new google.maps.Map(document.getElementById("canvas"), {zoom: 1, mapTypeId: google.maps.MapTypeId.HYBRID});
				$g.gbounds = new google.maps.LatLngBounds();
				$g.ginfowin = new google.maps.InfoWindow();
				$g.heatmap = new google.maps.visualization.HeatmapLayer({map: null, radius: 40});
				$(window).on("resize orientationchange", function(){
					if ($.mobile.pageContainer.pagecontainer('getActivePage').attr('id') == '#map') $g.scaleContentToDevice('#canvas');
				})
			}
			$g.show.maps($g.mapId, 'pla');
		}
	});
	$("body").on("pagecontainerbeforeshow", function (event, ui) {
		var page = '#'+$.mobile.pageContainer.pagecontainer('getActivePage').attr('id');
		//change menu if google maps
		document.getElementById('menu').href = page.startsWith('#map') ? '#mappanel' : '#panel';
	    // Change the heading in the external fixed header copying text from the special <cite> tag used to hold it.
		$("[data-role='header'] h2 small").empty();
	    $("[data-role='header'] h2 small" ).text($(page +' cite.title').text());
		// if detail page add buttons to right side of header
		$("[data-role='header'] #ctrl").html('');
		if (page == '#detailpage') $("[data-role='header'] #ctrl").html($('#detailpage #icons').html());
	//# $g.logit("pagecontainerbeforeshow", page, event, ui);
	});
	$("body").on("pagecontainershow", function (event, ui) {
		var page = '#'+$.mobile.pageContainer.pagecontainer('getActivePage').attr('id');
		if (page == '#place' && $('#placemap').length) {
			var pla=$g.json.pla[$('#placemap').data('place')];
			var gmapData = $g.getMapData(pla.l.split(','), pla.d || {});
			$('#map_canvas').gmap({center:gmapData.point, zoom: gmapData.zoom || 7, mapTypeId: gmapData.type || google.maps.MapTypeId.HYBRID, marker:{position:gmapData.point}});
			$('#map_canvas').gmap('addMarker', { 'position':gmapData.point , 'bounds': false }).click(function() {
				$('#map_canvas').gmap('openInfoWindow', { 'content':gmapData.data}, this);
			});
		}
	});

	$("body>[data-role='panel']").panel();
	
	// iniitalise language translation using i18next library
	
	// use dynamic scripts to load language resources instead of xhr so that it will still work with file:// protocol under chrome
	
	$g.i18next_backend = {
		type: 'backend',
		init: function(services, backendOptions, i18nextOptions) {
			console.log('backend init is not provided');
		/* use services and options */
		},
		read: function(lng, ns, loadComplete) {
			console.log('backend read', lng, ns);
			var script = document.createElement('script');
			script.setAttribute('type','text/javascript');
			script.setAttribute('src', '../../Apps/locales/'+lng+'/'+ns+'.json?v=' + Math.random());
			script.onload = function() {
				loadComplete(null, resources);
			}
			var head = document.getElementsByTagName('head').item(0);
			head.appendChild(script);
		},

		// optional
		readMulti: function(languages, namespaces, callback) {
			console.log('backend readMulti is not provided');
			/* return multiple resources - usefull eg. for bundling loading in one xhr request */
			return {
			  en: {
				translations: {
				  key: 'value'
				}
			  },
			  de: {
				translations: {
				  key: 'value'
				}
			  }
			}
		},
		create: function(languages, namespace, key, fallbackValue) { 
			console.log('backend create is not provided');
			/* save the missing translation */
		}
	}
	
	i18next
		.use($g.i18next_backend)
		.use(i18nextIntervalPluralPostProcessor)
		.init({
			fallbackLng:'en',
			getAsync: false,
			joinArrays:'/n', crossDomain: true, debug: true },
			//start app via i18next callback i.e. once i18next initialiased
			function () {
				$('body').pagecontainer('change', '#splash', {'allowSamePageTransition':true})
				setTimeout(function() {$('#splash').fadeOut(1000);setTimeout(function() {$g.start();},950)}, 2000);
			}
		);



});


