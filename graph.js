var raphs = {};
var charts = {};
var nothing;

var exportGraph = function(id, url, anchor) {
    if( jQuery(anchor).hasClass("loading") ) return false;
    var download_url = url + "graph_download?filename=";
    url = url + "graph_svg";
    var callback = function(data, status, req) {
        jQuery(anchor).removeClass("loading").text("Save");
	var filekey = req.responseText;
	var dialog = jQuery("<div title='Graph Image Saved'></div>");
        var ul = jQuery("<ul/>").appendTo(dialog); var li = jQuery("<li/>").appendTo(ul);
	jQuery("<a />").text("view")
	  .attr("href", "/static/graphs/" + filekey + ".png")
      	  .attr("target", "_blank")
          .appendTo(li);
        jQuery("<span />").text("  or").appendTo(li);
	li = jQuery("<li/>").appendTo(ul);
        jQuery("<a />").text("download")
	  .attr("href", download_url + filekey)
	  .attr("target", "_blank")
	  .appendTo(li);
        dialog.dialog({modal: true});
    };
    var json = raphs[id].serialize.json();
    var xAxis = jQuery(".mg .x_axis select option:selected").text();
    var title = jQuery("#main_graph_title").text();
    var vars = [];
    jQuery("#mg_varlegend #legend li").each(
      function() {
	var color = jQuery(this).css("color");
	var text = jQuery(this).children("a").text();
	var dataset = jQuery(this).children("a").attr("href").substr(1);
	var layer = Dataset.get(dataset).layer();
	var isVisible = jQuery("#mg_layers .layerstab li input[name='"+layer.id+"']"
			      ).attr("checked");
	if( !isVisible ) {
	  return;
	}
	var opacity = Layer.get(
			jQuery("#layers_in_graph li.highlight input").attr("name")
			).has_dataset(
			  dataset
			) ? 1 : 0.25;
	vars.push({text: text, color: color, opacity: opacity});
    });
  jQuery(anchor).addClass("loading").text("Saving..");

  jQuery.post(url, {async: false, json: json, vars: JSON.stringify(vars), xAxis: xAxis, title: title}, callback);
};

Raphael.fn.g.colors = [];
for( var i=0; i<150; ++i ) {
  var choices = "0123456789abcdef";
  var color = "#";
  for( var j=0; j<3; ++j ) {
    var c = Math.floor(Math.random()*16);
    color += choices[c];
    c = Math.floor(Math.random()*16);
    color += choices[c];
  }
  Raphael.fn.g.colors.push(color);
}

var DrawWhenReady = function(count, before, after) {
    var self = this;

    this.load = function(var_id, url) {
        if( !var_id ) {
	  before(var_id, self);
	  after(var_id, self);
	  return;
        };

        if( jQuery.inArray(var_id, self._vars) != -1 ) {
	    return;
	};
        self._vars.push(var_id);

	var callback = function(data) {
	    var newEl = jQuery(data).filter("table");
	    newEl.appendTo("#data");
	    var id = newEl.attr("id");
	    self.tick();
	    after(var_id, self);
	};
        before(var_id, self);
	if( Dataset.exists(var_id) ) {
	  after(var_id, self);
	  return;
	}
        jQuery.get(url, callback);
	return true;
    };
    this.count = count;
    this._vars = [];
    this.tick = function() {
	--self.count;
	if( self.count == 0 ) {
	    self.draw();
	    return true;
	}
    };
    this._addLater = [];
    this.addLater = function(var_id, graph_id) {
	self._addLater.push([var_id, graph_id]);
    };
    this.draw = function() {
	for( var i=0; i<self._addLater.length; ++i ) {
	    var var_id = self._addLater[i][0],
	    graph_id = self._addLater[i][1];
	    Visual.add(var_id, graph_id);
	}
    };
};

function resetLayers(graph_id, xAxis) {
  /*
   * Redraw the graph
   *
   * @param xAxis: id of variable to plot on the x axis, or none
   *               (if none, will use turn #)
   */
  var layers = Layer.get(graph_id).datasets();

  var datasets = [];
  var labels = [];
  var dataset_x = [];
  layers.each(function() {
    var dataset = this.values();
    if( this.id == xAxis ) {
      dataset_x = dataset;
    } else {
      datasets.push(dataset);
      labels.push(this.id);
    };
  });

  // if this graph has no datasets
  if( datasets.length == 0 ) {
    jQuery(raphs[graph_id].canvas).remove();
    return;
  };

  if( dataset_x.length == 0 ) {
    for( var i=0; i<datasets[0].length; ++i ) { dataset_x.push(i); };
  };

  if( raphs[graph_id].chart !== undefined ) {
    jQuery(raphs[graph_id].canvas).remove();
    raphs[graph_id].chart = nothing;
    raphs[graph_id] = nothing;
    initGraph(graph_id);
  };

  var shouldStroke = false;
  if( xAxis !== undefined ) { shouldStroke = true; };

  var raph = raphs[graph_id];

  var chart = raph.g.linechart(
    100, 30, 500, 250, dataset_x, datasets,
    {nostroke: shouldStroke, axis: "0 0 1 1", symbol: "o",
     axisxstep: dataset_x.length-1, axisystep: 10,
     colors: getColors(labels)});

  raphs[graph_id].chart = chart;
  //  drawLegend(chart, labels, raph);
};

function getRealLabels(graph_id, xAxis) {
  labels = [];
  var layers = Layer.get(graph_id).datasets();
  layers.each(function() {
    var dataset = jQuery(this).find("td").map(
      function() {
	var val = jQuery(this).text();
	val = parseFloat(val);
	if( isNaN(val) ) return 0;
	return val;
      }).get();
    if( jQuery(this).attr("id") != xAxis ) {
      labels.push(jQuery(this).attr("id"));
    };
  });
  return labels;
};

function drawLegend(chart, labels, raph) {
  if( chart.labels ) {
    chart.labels.remove();
  };
  chart.labels = raph.set();
  var x = 15; var h = 5;
  for( var i = 0; i < labels.length; ++i ) {
    var clr = chart.symbols[i][0].attr("fill");
    chart.labels.push(raph.set());
    chart.labels[i].push(raph.g["disc"](x + 5, h, 5)
      .attr({fill: clr, stroke: "none"}));
    chart.labels[i].push(txt = raph.text(x + 20, h, labels[i])
      .attr(raph.g.txtattr)
      .attr({fill: "#000", "text-anchor": "start"}));
    x += chart.labels[i].getBBox().width * 1.2;
  };
};

function initGraph(graph_id) {
  raphs[graph_id] = Raphael(graph_id, 600, 300);
};

function buildBookmark() {
  var url = "";
  Layer.getAll().each(function() {
	  var graph_id = this.id;
	  this.datasets().each(function() {
		  url += graph_id + "=" + this.id + "&";
	      });
      });
  url = url.substr(0, url.length-1); // trim trailing amp
  return url;
};

/*
 * Stuff below here is tied to the UI and to MVSim;
 * doesn't really belong here.
 */

function attachNewGraphToDom(el) {
  el.insertBefore("#data");
};
function makeNewGraph(id) {
  var graphs = Layer.getAll();
  id = id || "graph" + graphs.length;
  var newGraph = jQuery("<div />").attr("id", id)
    .addClass("graph");
  jQuery("<div class='variables'/>").appendTo(newGraph);
  attachNewGraphToDom(newGraph);
  initGraph(newGraph.attr("id"));
  newGraph.draggable({revert: true});
  newGraph.droppable({
    drop: function(event, ui) {
      var dragged = ui.draggable;
      var from = jQuery(dragged).attr("id");
      var onto = jQuery(this).attr("id");
    Visual.superimpose(from, onto);
  }});

  return newGraph;
};

function new_layer(id) {
  var newGraph = jQuery("<div />").attr("id", id)
    .addClass("graph");
  jQuery("<div class='variables'/>").appendTo(newGraph);
  jQuery(newGraph).appendTo("#layer_set");
};

function shadow_one(layer) {
  var existing = jQuery("#shadow_layers #shadow_" + layer.id);
  if( existing.length ) {
    existing.replaceWith(jQuery(layer.sel).clone().attr("id", "shadow_" + layer.id));
  } else {
    jQuery(layer.sel).clone().attr("id", "shadow_" + layer.id)
      .appendTo("#shadow_layers");
  }
};
function shadow() {
  var layer_id = "primary";
  Visual.layers("primary").each(
    function() { shadow_one(this); }
  );
};
function drawPrimaryGraph(drawAll, toHighlight) {
  var layer_id = "primary";
  var layerVariables = [];
  var layer = Layer.get(layer_id);
  layer.datasets().each(function() {
    layerVariables.push(new Variable(this.id));
  });
  //render_template("legend.html", {variables: layerVariables}, "div#legendbox");

  if( Layer.get(layer_id).datasets().length || Visual.isComposite(layer_id) ) {
    // draw graph
    jQuery("#primary_graph").children().first().remove();
    var x_axis = jQuery(".mg .x_axis select").val();
    drawGraph(layer_id, "primary_graph", 500, 300,
	      "0 0 1 1", true, x_axis);
    var last_layer;
    Visual.layers(layer_id).each(
      function() {
	var shouldDisplay = drawAll || jQuery("form#mg_layers input[type=checkbox][name="+this.id+"]").attr("checked");
	if( !shouldDisplay ) return;
	var paper = drawLayerBuffer(this.id, x_axis);
	superimpose(this.id, layer_id, paper);
	last_layer = this.id;
      });

    var layerToHighlight;
    if( toHighlight && drawAll || jQuery("form#mg_layers input[type=checkbox][name="+toHighlight+"]").attr("checked") ) {
      layerToHighlight = toHighlight;
    };

    layerToHighlight = layerToHighlight || last_layer;
    if( layerToHighlight ) {
      toggleSupHighlight(layer_id, layerToHighlight);

      jQuery("#mg_layers .layerstab li a")
	.parent("li").removeClass("highlight");

      jQuery("#mg_layers .layerstab li a[href=#"+layerToHighlight+"]")
	.parent("li").addClass("highlight");

      jQuery("#mg_varlegend ul#legend li a")
	.parent("li").removeClass("highlight");

      Layer.get(layerToHighlight).datasets().each(function() {
	var x = jQuery("#mg_varlegend ul#legend li a[href='#"+this.id+"']")
	.parent("li").addClass("highlight");
      });
    }

  }

  if( Visual.layers(layer_id).length == 0 ) {
    // draw blank slate text
    var blankslate = jQuery("<div>").css("height", "300px");
    blankslate.html("<small>"
		    + "<center><p>"
		    + "This top section is the Main Graph "
		    + " that you are building. It allows you "
		    + " to visualize historical data from "
		    + " your data sources in relative scales. It "
		    + " consists of layers that you construct"
		    + " in the section below."
		    + "</p><p>"
		    + "Your first task is to create a layer "
		    + "or layers and \"push\" them to this"
		    + " graph so that you can see them. One"
		    + " of these layers will always be \"Primary\""
		    + " which means that it will be easier to"
		    + " see than the other layers and its scale"
		    + " will be visible on the Y-axis. You can"
		    + " switch Primary layers by"
		    + " clicking on a variable in the \"Variables "
		    + "in this Graph\" box. Please see "
		    + "<a target='_blank' href='http://mvsim.wikischolars.columbia.edu/Graphing+Tool+Quick+Start+Guide'>here</a> "
		    + "for a more detailed tutorial of"
		    + " how to use this tool."
		    +"</p></center><ul>"
		    + "<li>You can save a link to your graph by"
		    + " clicking the \"Link\" button above and"
		    + " copying the hyperlink in the dropdown.</li>"
		    + "<li>You can save an image of your graph"
		    + " by clicking on the save button above. "
		    + "It will let you download the graph image"
		    + " as a jpg file, or open the graph as an"
		    + " image in another tab or window, where "
		    + "you can view it, or right-click on the image"
		    + " to copy to your clipboard or download.</li></ul>"
		    +"</small>");
    jQuery("#primary_graph").children().first().replaceWith(blankslate);
  }
};

function drawLayerBuffer(layer_id, x_axis) {
  var layerVariables = [];
  jQuery("#invisible_container").children().remove();
  var layer = Layer.get("shadow_" + layer_id);
  layer.datasets().each(function() {
    layerVariables.push(new Variable(this.id));
  });

  return drawGraph("shadow_" + layer_id,
		   "invisible_container",
		   500, 300,
		   "0 0 1 1", true, x_axis);
};

function drawLayer(layer_id) {
  var layerVariables = [];
  var layer = Layer.get(layer_id);
  layer.datasets().each(function() {
    layerVariables.push(new Variable(this.id));
  });

  var ul = jQuery("#legendbox ul#legend");
  ul.empty();

  jQuery(layerVariables).each(
    function() {
      var variable = this;
      var li = jQuery("<li />");
      li.css("color", variable.color);
      var a = jQuery("<a />")
	.attr("href", "#"+variable.name)
	.text(variable.text);
      a.appendTo(li);
      li.appendTo(ul);
    });

  jQuery("h3.layertitle").attr("name", layer_id)
      .text(layer.text());
  if( layer.datasets().length ) {
    // draw graph
    jQuery("#layer_graph_container").children().first().remove();
    var x_axis = jQuery("#layer_graph_container .x_axis select").val();
    drawGraph(layer_id,
	      "layer_graph_container",
	      500, 300,
	      "0 0 1 1", true, x_axis);

    // and allow it to be pushed to the primary graph
    jQuery("div.layer_actions input[value='Push']")
      .removeAttr("disabled");

  } else {
    // draw blank slate text
    var blankslate = jQuery("<div>").css("height", "300px");
    blankslate.html("<small>"
		    + "<center><p>"
		    + "This is the Graph Layer section. It is your workspace"
		    + " for building layers that can be displayed in the Main"
		    + " Graph above. You can construct layers with any "
		    + "available variable, but it makes sense to use variables"
		    + " whose scales are similar so that variations in the"
		    + " variable value are easier to see.</p></center>"
		    + "<ul><li>Click on the \"Variables\" tab to the left"
		    + " and then DOUBLE-CLICK on a variable from the list"
		    + " to display it in the current layer."
		    + "</li><li>DOUBLE-CLICK on a variable from the \"Variables"
		    + " in this Layer\" box to remove it from the layer."
		    + "</li><li>When you are ready to put the layer into the"
		    + " Main Graph, click the \"Push\" button below. To "
		    + "delete a layer from the Main Graph, click the"
		    + " \"Delete\" button."
		    + "</li><li>Click \"Create new layer\" to make a new"
		    + " layer. Rename the later by clicking on its name"
		    + " right above this box."
		    + "</li><li>You have access to any layer you have"
		    + " already created through the \"Layers\" tab to the left."
		    + "</li></ul></small>"
		   );
//    blankslate.text("");
    jQuery("#layer_panel .plot").children().first().replaceWith(blankslate);

    // and don't allow it to be pushed to the primary graph
    jQuery("div.layer_actions input[value='Push']")
      .attr("disabled", "disabled");
  }
};

function getColor(var_id) {
  if( var_id == "morx" ) return "";
  var colors = Raphael.fn.g.colors;
  var index = jQuery("#data table#" + var_id).index();
  return colors[index];
};

function getColors(var_ids) {
  var colors = [];
  jQuery(var_ids).each(function() {
    colors.push(getColor(this));
  });
  return colors;
};

function superimpose(graph_id, onto, from_paper) {
  var from;
  if( from_paper ) {
    from = from_paper.chart;
  } else {
    from = raphs[graph_id].chart;
  }
  var to = raphs[onto].chart;

  superdepose(onto, graph_id, from); // XXX ?

  var i;
  for( i=0; i<from.lines.length; ++i ) {
    var line = from.lines[i];
    if( line.from_graph ) continue;
    line = line.clone();
//    line.attr("stroke", Raphael.fn.g.colors[to.lines.length]);
    line.from_graph = graph_id;
    line.insertAfter(to.lines[to.lines.length-1]);
    to.lines.push(line);
  };
  for( i=0; i<from.symbols.length; ++i ) {
    var symbolset = from.symbols[i];
    if( symbolset.from_graph ) continue;
    symbolset = symbolset.clone();
//    symbolset.attr("fill", Raphael.fn.g.colors[to.symbols.length]);
    symbolset.from_graph = graph_id;
    for( j=0; j<symbolset.length; ++j ) {
      var symbol = symbolset[j];
      var series = to.symbols[to.symbols.length-1];
      symbol.insertAfter(series[series.length-1]);
    };
    to.symbols.push(symbolset);
  };
//  drawLegend(charts[onto], getAllLabels(onto), raphs[onto]);
  toggleSupHighlight(onto);
};

function superdepose(a, b, gb) {
  toggleSupHighlight(a);
  var ga = raphs[a].chart;
  gb = gb || raphs[b].chart;
  var pops = [];
  for( i=0; i<ga.lines.length; ++i ) {
    var line = ga.lines[i];
    if( line.from_graph == b ) {
      line.remove();
      pops.push(i);
    };
  };
  jQuery(pops).each(function() {
		      ga.lines.pop(this);
		    });
  pops = [];
  for( i=0; i<ga.symbols.length; ++i ) {
    var symbolset = ga.symbols[i];
    if( symbolset.from_graph == b ){
      symbolset.remove();
      pops.push(i);
    };
  };
  jQuery(pops).each(function() {
		      ga.symbols.pop(this); //TODO: this doesn't work, pop doesn't take an index
		    });
//  drawLegend(charts[a], getAllLabels(a), raphs[a]);
};

function getAllLabels(graph_id) {
  var chart = raphs[graph_id].chart;
  var all_labels = {};
  var labels = [];
  all_labels[graph_id] = getRealLabels(graph_id);
  var i;
  for( i=0; i<chart.symbols.length; ++i ) {
    var from_id = chart.symbols[i].from_graph || graph_id;
    if( !all_labels[from_id] ) all_labels[from_id] = getRealLabels(from_id);
    labels.push(all_labels[from_id].shift());
  };
  return labels;
};

function toggleSupHighlight(graph_id, highlight) {
  var from = raphs[graph_id].chart;
  for( i=0; i<from.lines.length; ++i ) {
    var line = from.lines[i];
    if( line.from_graph == highlight ) {
      line.attr("opacity", 1);
    } else {
      line.attr("opacity", 0.25);
    };
  };
  for( i=0; i<from.symbols.length; ++i ) {
    var symbolset = from.symbols[i];
    if( symbolset.from_graph == highlight ) {
      symbolset.attr("opacity", 1);
    } else {
      symbolset.attr("opacity", 0.25);
    };
  };
  if( !highlight ) {
    if( typeof(from.axis) === 'undefined' ) {
      return;
    }
    from.axis[1].text.show();
    if( from.axis[1].superimposed_text ) {
      from.axis[1].superimposed_text.remove();
    }
  } else {
    from.axis[1].text.hide();
    installAxis(from, raphs["shadow_"+highlight].chart);
  };
  if( graph_id == "primary" && Layer.exists(highlight) ) {
    jQuery("#main_graph_title").text(Layer.get(highlight).text());
    jQuery("#main_graph_title").attr("class", highlight);
  };
};

function installAxis(on, from) {
  if( on.axis[1].superimposed_text ) {
    on.axis[1].superimposed_text.remove();
  };
  axis = on.axis[1].superimposed_text = from.axis[1].text.clone();
  var ref = on.axis[1].text;
  for( i=0; i<axis.length; ++i ) {
    axis[i].insertAfter(ref[ref.length-1]);
  };
};
