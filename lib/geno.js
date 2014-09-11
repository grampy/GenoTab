(function(global){    // BEGIN CLOSURE

    /**
     * @name $geno
     * @namespace Holds functionality related to genogram diagrams.
     */
    var $geno = global.$geno = {
		default_map: '',
		default_z: {Ind: 150, Ent: 90, Fam: 100, Occ: 0,Edu: 0, Hou: 90, Emo: 150, Lab: 90, Sha: 90, Ped: 135 , Pic: 0, Sec:150},
		maps:{},
		shapes:{},
		sizes:{T:1, S:2, M:3, L:4, X:5, XX:6, XXX:7, XXXX:8},
		scale:[0,.5,.75,1,1.5,2,3,4,9],
		fonts:[6,7.5,10,16,22,32,48,96],
		lines:[8,11,14,21,28,48,96,144],
		relationStyles : {
			Marriage:           "#000000/none",         //black
			Widowed:            "#000000/none",
			Divorce:            "#800000/none",         //maroon
			Separation:         "#800000/none", 
			SeparationLegal:    "#800000/none", 
			Nullity:            "#800000/none",
			Engagement:         "#0000ff/10,5;",        //blue
			TemporaryRelation:  "#0000ff/2,10,6,10;",
			Rape:               "#ff0000/2,10;",        //red
			Other:              "#808080/3,3,3,6;",     //gray
			_default:           "#808080/none"
		},
		dasharray : {
			 ''			: 'none',
			 '-'		: '5,5',
			 '.'		: '1,4',
			 '-.'		: '6,4,2,4',
			 '-..'		: '6,4,2,4,2,4',
			 '-...'		: '6,4,2,4,2,4,2,4',
			 '_'		: '10,4',
			 '-*'		: '4,10',
			 '.*'		: '2,5',
			 '-*.*'		: '5,5,2,5',
			 '-*.*.*'	: '5,5,2,5,2,5',
			 '-*.*.*.*'	: '5,5,2,5,2,5,2,5',
			 '..*'		: '2,2,2,4,3'
		 },
		pedigree : { 	//[colour, stroke-dasharray]
			'Parent'	: ['black','none'],
			'Biological': ['black','none'],
			'Adopted'	: ['blue','5'],
			'Foester'	: ['green','5'],
		},
		Point : function(obj, dx, dy) {
			// normalize a point relative to the origin (dx,dy) and invert y axis
			var p = obj.split(',');
			return [parseInt(p[0]) - dx, dy - parseInt(p[1])];
		},
		
		Position : function(obj, dx, dy) {
			// normalize a point relative to the origin (dx,dy) and invert y axis
			var p = obj.split(',');
			return {x : parseInt(p[0]) - dx, y : dy - parseInt(p[1])};
		},
		
		Points : function(obj, dx, dy) {
			// normalize points relative to the origin (dx,dy) and invert y axis
			var p, a = true, list = [];
			if (typeof obj != 'string') { // GenoPro Position.Points 
				p = ((obj && obj.$Points) ? obj.$Points : '').split(',');
			} else {	// GenoPro Position
				if (p == '') return null;
				p = obj.split(',');
			}
			for (var i=0; i < p.length; i++) 
			{
				list[list.length] = {x: parseInt(p[i]) - dx, y: dy - parseInt(p[++i])};
			};
			return (typeof obj == 'string' && list.length == 1 ? list[0] : list); 
		},
		
		Bbox : function(p) {
			// reformat points array into Raphael 'rect' object
			return {x:p[0], y:p[1], width:p[2]-p[0], height:p[3]-p[1]};
		},
		
		Size : function(p) {
			// reformat points array into JointJS 'size' object
			return {width:p[1].x-p[0].x, height:p[1].y-p[0].y};
		},
		
		Splitter : function(name, max) {  // WIP
			// split name into lines up to given maximum no. of lines 
			var maxline=0 ,maxlines = (max ? max : $geno.json.Global.Name.Display.$_Lines);
			var lines = name.split(' ');
			if (lines.length <= maxlines) return lines;
			for (var i=0; i < lines.length; i++) {
				if (lines[i].length > maxline) maxline = lines[i].length;
			};
			for (var i=0; i < lines.length; i++) {
				if (lines[i].length > maxline) maxline = lines[i].length;
			};
		},
		$Js : global.joint.shapes,
    
		$Jd : global.joint.dia
    };

    $geno.$Jd.chart = {};
	$geno.$Js.chart = {};

	$geno.$Js.chart.Individual = joint.dia.Element.extend({

		markup: '<g class="rotatable"><g class="scalable"><rect class="box"/><g class="symbol"><circle class="midpoint"/><rect class="male"/><circle class="female"/><path class="pet"/><text class="unknown"/></g></g><text class="name"/></g>',
		
		defaults: joint.util.deepSupplement(
			{type : 'chart.Individual'
			,attrs: {
				'.box': { fill: 'white', stroke: 'black' },
                '.midpoint': {r: 1, 'ref-x': 0, 'ref-y': 0, ref: '.box', magnet: true, fill: 'white', stroke: 'none'},
				'.male': {width:16, height:16, stroke: 'black', ref:'rect'},
				'.female': {r:8, ref:'rect'},
				'.pet': {d:'m-8 0 l8 -8 8 8 -8 8 z', stroke: 'black', fill: 'white', ref:'rect'},
				'.unknown': {text:'?', ref:'rect'},
				'.name': { 'font-size': 11, text: '', 'ref-x': .5, 'ref-y': .5, ref: '.midpoint', 'x-alignment': 'middle', fill: 'black', 'font-family': 'Arial, helvetica, sans-serif' }
				}
			}, joint.shapes.basic.Generic.prototype.defaults
		)
	});
	
    $geno.$Jd.chart.Family = $geno.$Js.basic.Generic.extend({

        markup: '<g class="rotatable"><g class="scalable"><rect/><path/></g><text/></g>',
        
        defaults: joint.util.deepSupplement({

            type: 'chart.Path',
            attrs: {
                'rect': { fill: 'transparent', stroke: 'transparent'},
                'path': { fill: 'white', stroke: 'black', 'ref-x': 0, 'ref-y': 0, ref: 'rect' },
                'text': { 'font-size': 12, text: '', 'ref-x': 0, 'ref-y': .5, ref: 'rect', 'x-alignment': 'middle', fill: 'black', 'font-family': 'Arial, helvetica, sans-serif' }
            }
        }, joint.shapes.basic.Generic.prototype.defaults)
    });

    $geno.$Js.chart.Link = joint.dia.Link.extend({
        defaults: joint.util.deepSupplement({
            type: 'chart.Link',
            attrs: { 
                //'.marker-vertices': { display : 'none' },
                //'.link-tools': { display : 'none' },
                //'.connection-wrap': { display: 'none' },
                '.marker-arrowheads': { display: 'none' }
            }
        }, joint.dia.Link.prototype.defaults)
    });
	
	$geno.$Js.chart.LinkView = joint.dia.LinkView;
	
    $geno.$Js.Family = Backbone.Model.extend({
        initialize: function(attributes, options){
        // options
            this.set(attributes);
            with (attributes) {
                var map = $geno.maps[Position.$_Chart || $geno.default_map],
                    size = $geno.sizes[Position.$_Size || "M"],
                    scale = $geno.scale[size],
                    xy = $geno.Points($Position, map.dx, map.dy),
                    p = (Position.$Points ? $geno.Points(Position.$Points, map.dx - xy.x, map.dy - xy.y) : []),
                    path='',bl=undefined,br=undefined,tl,tr;
                var decoration = (attributes.$Relation && $geno.relationStyles.hasOwnProperty($Relation) ? $geno.relationStyles[$Relation] : $geno.relationStyles['_default']).split('/');
                tl=$geno.Point(Position.Top.$Left, map.dx + xy.x, map.dy - xy.y);
                tr=$geno.Point(Position.Top.$Right, map.dx + xy.x, map.dy - xy.y);
                family_top = new $geno.$Jd.chart.Family({
                    position: xy
					,size: {width: tr[0]-tl[0], height: 3}
					,z: (attributes.Position && Position.$_z ? Position.$_z : $geno.default_z['Fam'])
                    ,attrs: 
                        {path: 
							{ d: 'M'+tl.join()+' L'+ tr.join()
                            ,stroke:decoration[0]
                            ,'stroke-width':size
                            ,'stroke-dasharray':decoration[1]
                        }
                        ,text: {text: (attributes.$DisplayText ? $DisplayText : '')}
                    }
                });
                this.ID = family_top.ID;
				this.top = family_top;
				this.bottom = family_top;
                map.chart.addCell(family_top);
                if (Position.Bottom && Position.Bottom.$Left){
                    bl=$geno.Point(Position.Bottom.$Left, map.dx + xy.x, map.dy - xy.y);
                    br=$geno.Point(Position.Bottom.$Right, map.dx + xy.x, map.dy - xy.y);
                    family_bottom = new $geno.$Jd.chart.Family({
                        position: {x:xy.x, y: bl[1]+xy.y},
                        size: { width: br[0]-bl[0], height: 3 },
 						z: (attributes.Position && Position.$_z ? Position.$_z : $geno.default_z['Fam']),
						attrs: {
                            path: { d: 'M'+bl.join() +' L'+br.join(),
                                stroke:decoration[0],
                                'stroke-width':size,
                                'stroke-dasharray':decoration.length == 2 ? decoration[1] :'none'
                            },
                            text: {text: ''}
                        }
                    });
                    family_top.embed(family_bottom);
                    family_middle = new $geno.$Js.chart.Link({
                         source: {id:family_top.id},
						target: {id:family_bottom.id},
						vertices: p,
						z: (attributes.Position && Position.$_z ? Position.$_z : $geno.default_z['Fam']),
						attrs: {
							path: { stroke:decoration[0],fill:'none',
								   'stroke-width':size,
								   'stroke-dasharray': decoration.length == 2 ? decoration[1] :'none'
							}
						}
					});
                   map.chart.addCell([family_bottom, family_middle]);
                   family_top.embed(family_middle);
				   this.bottom = family_bottom;
                };
            };
        }
    });

})(this);    // END CLOSURE
