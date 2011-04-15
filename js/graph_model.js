
  var make_bookmark = function() {
    var string = "";
    getLayers().each(function() {
      var key = this.id;
      this.datasets().each(function() {
        string += key + "=" + this.id + "&";
      });
      string += key + "_label=" + this.text() + "&";
    });
    Visual.layers("primary").each(function() {
      string += "primary=" + this.id + "&";
    });

    var x_axis = jQuery(".mg .x_axis select").val();
    if( x_axis ) string += "primary_xaxis=" + x_axis + "&";
    x_axis = jQuery(".gl .x_axis select").val();
    if( x_axis ) string += "secondary_xaxis=" + x_axis + "&";
    string = string.substr(0, string.length-1);
    return string;
  };

var log = function(msg, type) {
  type = type || "log";
  if( console && console[type] ) {
    console[type](msg);
  };
};

function drawGraph(id,
//		   top, left,
		   container,
		   width, height,
		   axis,
		   showNodes,
		   xAxis,
		   dontSetGlobal) {
  var datasets = [];
  var dataset_x;
  var labels = [];
  Layer.get(id).datasets().each(
    function() {
      var dataset = this.values();
      datasets.push(dataset);
      labels.push(this.id);
    }
  );

  if( datasets.length == 0 ) throw "nothing to graph!";
  if( xAxis ) {
    dataset_x = Dataset.get(xAxis).values();
  }
  if( !dataset_x && !xAxis ) {
    dataset_x = [];
    for( var i=0; i<datasets[0].length; ++i ) { dataset_x.push(i); };
  }

  var symbol = showNodes && "o" || "";
  var paper = Raphael(container, 600, 300);
//  var paper = Raphael(top, left, width, height);
  var chart = paper.g.linechart(100, 30, 500, 250,
				dataset_x, datasets,
			       {
				 axis: axis,
				 symbol: symbol,
				 nostroke: xAxis && 1 || 0,
				 colors: getColors(labels),
				 axisxstep: dataset_x.length-1,
				 axisystep: 10
			       });
  paper.chart = chart;

  if( typeof(dontSetGlobal) === 'undefined' ) raphs[id] = paper;
  return paper;
};

var serializeWorld = function() {
  var container = jQuery("<div>");
  jQuery("div#data").clone().appendTo(container)
    .find("*").removeAttr("class");
  jQuery("div.graph").clone().appendTo(container)
    .attr("class", "graph")
    .find("svg").remove();
  container.find("*").removeAttr("style");
  return container[0].innerHTML;
};

var Visual = {};
Visual.add = function(var_id, layer_id) {
    Layer.get(layer_id).add_dataset(var_id);
    resetLayers(layer_id);
};
Visual.remove = function(var_id, layer_id) {
    Layer.get(layer_id).remove_dataset(var_id);
    resetLayers(layer_id);
};
Visual.move = function(var_id, from, to) {
    Visual.remove(var_id, from);
    Visual.add(var_id, to);
};
Visual.split = function(var_id, from) {
    var to = makeNewGraph().attr("id");
    Visual.move(var_id, from, to);
};
Visual.scatterOver = function(var_id, layer_id) {
  var layer = Layer.get(layer_id);
  if( !layer.has_dataset(var_id) ) {
    log("Cannot scatter " + layer_id + " over " + var_id +
	"; it doesn't exist on that graph.", "error");
    return;
  }
  if( layer.datasets().length < 2 ) {
    log("Cannot scatter " + layer_id + " over " + var_id +
	"; it is the only variable on that graph.", "error");
    return;
  }
  layer._varsEl().children("a").removeClass("xAxis"); // @@html
  layer._varsEl().children("a[href=#"+var_id+"]").addClass("xAxis");
  resetLayers(layer_id, var_id);
};
Visual.unscatter = function(layer_id) {
    Layer.get(layer_id)._varsEl().children("a").removeClass("xAxis"); // @@html
    resetLayers(layer_id);
};
Visual.getXAxis = function(layer_id) {
  var x_axis = Layer.get(layer_id)._varsEl().children("a.xAxis"); // @@html
  if( x_axis.length == 0 ) return;
  return Dataset.get(x_axis.attr("href").substr(1));
};
Visual.superimpose = function(layer_id, onto_id, x_axis) {
  if( !Visual.has_layer("primary", layer_id) ) {
    var div = jQuery(Layer.get(onto_id).sel);
    if( div.children("div.layers").length == 0 ) {
      jQuery("<div>").addClass("layers").appendTo(div);
    }
    jQuery("<a>").attr("href", "#"+layer_id)
      .appendTo(div.children("div.layers"));
  }
};
Visual.superdepose = function(layer_id, from_id) {
  var div = jQuery(Layer.get(from_id).sel);
  div.find("div.layers>a[href=#"+layer_id+"]").remove();
  if( div.find("div.layers>a").length == 0 ) {
    div.children("div.layers").remove();
  }
};
Visual.isComposite = function(layer_id) {
  return jQuery(Layer.get(layer_id).sel).find("div.layers>a").length > 0;
};
Visual.layers = function(layer_id) {
  if( !Visual.isComposite(layer_id) ) return jQuery([]);
  return jQuery(Layer.get(layer_id).sel).find("div.layers>a")
    .map(function() {
	   return Layer.get(jQuery(this).attr("href").substr(1));
	 });
};
Visual.has_layer = function(layer_id, other_id) {
  return Visual.layers(layer_id)
    .filter(function() {
	      return this.id == other_id;
	    }).length > 0;
};
Visual.layer_variables = function(layer_id) {
  return Visual.layers(layer_id)
    .map(function() {
	   return Layer.get("shadow_" + this.id).datasets().toArray();
	   //return this.datasets().toArray();
	 });
};

var Layer = function(sel) {
  var el = jQuery(sel);
  if( el.length == 0 ) {
    throw new Layer.DoesNotExist(sel);
  };

  this.sel = sel;
  this.id = el.attr("id");
  this.setName = function(name) {
    jQuery(this.sel).attr("name", name);
  };
  this.text = function() {
    return jQuery(this.sel).attr("name") ||
      this.id.replace(/_/g, " ").replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
  };
  this._varsEl = function() {
    var vars_el = jQuery(this.sel).children("div.variables"); // @@html: LayerVariable
    if( vars_el.length != 1 ) {
      throw new Layer.MalformedLayer(sel, vars_el.length);
    };
    return vars_el;
  };
  this._varsEl(); // validate the html structure of this layer to find errors early

  this.min = function() {
    return Math.min.apply(
      Math,
      this.datasets().map(function() { return this.min(); }).toArray());
  };
  this.max = function() {
    return Math.max.apply(
      Math,
      this.datasets().map(function() { return this.max(); }).toArray());
  };

  this.datasets = function() {
    return this._varsEl().children("a") // @@html: LayerVariable
      .map(function() {
	var sel = jQuery(this).attr("href");
	return new Dataset(sel);
      });
  };
  this.has_dataset = function(id) {
    return this.datasets().filter(
      function() {
	return this.id == id;
      }).length > 0;
  };

  this.add_dataset = function(id) {
    if( this.has_dataset(id) ) return false;
    try {
      var dataset = Dataset.get(id);
    } catch(e) {
      if( e instanceof Dataset.DoesNotExist ) {
	log("Tried to add dataset " + id + " to layer " + this.id +
	    " but no such dataset exists", "error");
	return false;
      }
      throw(e);
    };
    jQuery("<a href='#" + dataset.id + "' />") // @@html: LayerVariable
      .appendTo(this._varsEl());
    return true;
  };

  this.remove_dataset = function(id) {
    if( !this.has_dataset(id) ) return false;
    this._varsEl()
      .children("a[href='#" + id + "']") // @@html: LayerVariable
      .remove();
    return true;
  };
};

Layer.getAll = function() {
  return jQuery("div.graph") // @@html: Layer
    .map(function() {
	   return new Layer(this);
	 });
};

Layer.get = function(id) {
  return new Layer("div.graph#"+id); // @@html: Layer
};
Layer.exists = function(id) {
  try {
      Layer.get(id);
      return 1;
  } catch( e ) {
      if( !(e instanceof Layer.DoesNotExist) ) {
	  throw e;
      }
      return 0;
  }
};
Layer.existsWithName = function(name) {
    var layers = Layer.getAll();
    for( var i = 0; i < layers.length; ++i ) {
	if( layers[i].text() == name )
	    return true;
    }
    return false;
};

var Dataset = function(sel) {
  var el = jQuery(sel);
  if( el.length == 0 ) {
    throw new Dataset.DoesNotExist(sel);
  };
  var self = this;

  this.sel = sel;
  this.id = el.attr("id");
  this.values = function() {
    return jQuery(sel).find("td").map(
      function() {
	var val = jQuery(this).text();
	val = parseFloat(val);
	if( isNaN(val) ) return 0;
      return val;
    }).toArray();
  };
  this.size = function() {
    return this.values().length;
  };

  var values = self.values();
  this.min = function() {
    return Math.min.apply(Math, values);
  };
  this.max = function() {
    return Math.max.apply(Math, values);
  };
  this.layer = function() {
    return Layer.get(
      jQuery("div.graph div.variables a[href='#"+this.id+"']")
             .closest("div.graph").attr("id"));
  };
  this.color = function() { return getColor(this.id); };
  this.text = function() {
    return jQuery("#data #"+this.id).attr("class") ||
      this.id.replace(/_/g, " ").replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
  };

};

Dataset.getAll = function() {
  return jQuery("#data table") // @@html: Dataset
    .map(function() {
	   return new Dataset(this);
	 });
};
Dataset.get = function(id) {
  return new Dataset("#data table#"+id); // @@html: Dataset
};
Dataset.exists = function(id) {
  try {
      Dataset.get(id);
      return 1;
  } catch( e ) {
      if( !(e instanceof Dataset.DoesNotExist) ) {
	  throw e;
      }
      return 0;
  }
};

/* * * * * * * *
 * Exceptions  *
 * * * * * * * */
Layer.DoesNotExist = function(id) {
  this.id = id;
};
Layer.MalformedLayer = function(id, len) {
  this.id = id;
  this.len = len;
};
Dataset.DoesNotExist = function(id) {
  this.id = id;
};


