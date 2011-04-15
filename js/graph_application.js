function getLayers() {
  return Layer.getAll().filter(function() {
    if( this.id == "primary" ) return false;
    if( this.id.substr(0, 7) == "shadow_" ) return false;
    return true;
  });
};

function drawLayersOnPrimaryGraph() {
  var layers = Visual.layers("primary");
  var ul = jQuery("div#layers_in_graph form#mg_layers ul.layerstab");
  ul.empty();
  layers.each(function() {
    var layer = this;
    var li = jQuery("<li />");
    var input = jQuery("<input />").attr("type", "checkbox")
                                   .attr("name", layer.id)
                                   .attr("checked", "checked");
    var a = jQuery("<a />").attr("href", "#"+layer.id)
                           .text(layer.text());
    input.appendTo(li);
    a.appendTo(li);
    li.appendTo(ul);
  });

  jQuery("#mg_varlegend ul#legend li a")
    .parent("li").removeClass("highlight");
  jQuery("#mg_layers .layerstab li a")
    .parent("li").removeClass("highlight");

  var last_layer = layers[layers.length-1];
  if( last_layer ) {
      jQuery("#mg_layers .layerstab li a[href=#"+last_layer.id+"]")
	.parent("li").addClass("highlight");

    last_layer.datasets().each(function() {
      jQuery("#mg_varlegend ul#legend li a[href='#"+this.id+"']")
        .parent("li").addClass("highlight");
    });

  }
};

function drawVariablesOnPrimaryGraph() {
  var variables = Visual.layer_variables("primary");

  var ul = jQuery("#mg_varlegend ul#legend");
  ul.empty();

  variables.each(function() {
    var variable = this;
    var li = jQuery("<li />").css("color", variable.color());
    var a = jQuery("<a />").attr("href", "#"+variable.id)
                           .text(variable.text());
    a.appendTo(li);
    li.appendTo(ul);
  });

  jQuery("#mg_varlegend ul#legend li a")
    .parent("li").removeClass("highlight");
  var last_layer = Visual.layers("primary").last()[0];
  if( last_layer ) {
    last_layer.datasets().each(function() {
      jQuery("#mg_varlegend ul#legend li a[href='#"+this.id+"']")
        .parent("li").addClass("highlight");
    });
  }
};

function drawLayersTab(highlight) {
  var layers = getLayers();

  var ul = jQuery("div#gl_tabber_layers form ul.layerstab");
  ul.empty();
  layers.each(function() {
    var layer = this;
    var li = jQuery("<li />");
    var a = jQuery("<a />").attr("href", "#"+layer.id)
                           .text(layer.text());
    if( layer.id == highlight ) {
      a.attr("class", "active");
    }
    a.appendTo(li);
    li.appendTo(ul);
  });

  // if length greater than one
  if( Math.max(0, layers.length-1) ) {
    jQuery("div.layer_actions input[value='Delete']").removeAttr("disabled");
  };
};

function markVariablesInUse() {
  getLayers().each(function() {
    this.datasets().each(function() {
      // make sure it is highlighted/disabled in the variable bin
      // happily, jquery won't duplicate a class that's already present
      // so we can just be dumb about this
      jQuery("#gl_tabber_variables ul.variablestab li a[href='#"+this.id+"']")
        .addClass("inUse");
    });
  });
};

function highlightLayerInTab(layer_id) {
  jQuery("#gl_tabber_layers .layerstab a").removeClass("active");
  jQuery("#gl_tabber_layers .layerstab a[href='#"+layer_id+"']").addClass("active");
};

var default_url_builder = function(variable) {
  return "variables/" + variable + ".html";
};

function startApp(initial_layer, url_builder, set_bookmark) {
  initial_layer = initial_layer || "layer_1";
  url_builder = url_builder || default_url_builder;
  set_bookmark = set_bookmark || function() {
    // do nothing
  };
  jQuery(window).load(function() {

    drawLayersTab(initial_layer);
    drawLayer(initial_layer);
    drawLayersOnPrimaryGraph();
    markVariablesInUse();

    // lame way of making sure the primary graph can be drawn
    var loader = new DrawWhenReady(0, function() { }, function() {
      Layer.get("primary").add_dataset("morx");
      shadow();
      drawPrimaryGraph();
      drawVariablesOnPrimaryGraph();
    });
    var url = url_builder("morx");
    loader.load("morx", url);

    jQuery(".mg .x_axis select").live("change", function() {
      var var_id = jQuery(this).val();
      var layer_id = jQuery("h3.layertitle").attr("name");
      var switchXAxis = function() {
        drawPrimaryGraph();
      };
      var loader = new DrawWhenReady(0, function() { }, switchXAxis);
      var url = url_builder(var_id);
      loader.load(var_id, url);
    });

    jQuery("#layer_graph_container .x_axis select").live("change", function() {
      var var_id = jQuery(this).val();
      var layer_id = jQuery("h3.layertitle").attr("name");
      var switchXAxis = function() {
        drawLayer(layer_id);
      };
      var loader = new DrawWhenReady(0, function() { }, switchXAxis);
      var url = url_builder(var_id);
      loader.load(var_id, url);
    });

    jQuery("div.layer_actions input[value='Push']").click(function() {
      var layer_id = jQuery("h3.layertitle").attr("name");

      // since the buffer is what will be pushed to the primary graph,
      // we want to use the primary graph's x-axis state
      var x_axis = jQuery(".mg .x_axis select").val();
      var loader = new DrawWhenReady(0, function() { },
        function() {
          Visual.superimpose(layer_id, "primary");
          shadow_one(Layer.get(layer_id));
          drawPrimaryGraph(true);
          drawVariablesOnPrimaryGraph();
          set_bookmark();
      });
      var url = url_builder(x_axis);
      loader.load(x_axis, url);

      drawLayersOnPrimaryGraph();
    });

    jQuery("div.layer_actions input[value='Delete']").click(function() {
      var layer_id = jQuery("h3.layertitle").attr("name");

      if( Visual.has_layer("primary", layer_id) ) {
        Visual.superdepose(layer_id, "primary");
        shadow_one(Layer.get(layer_id));
        drawPrimaryGraph();
        drawLayersOnPrimaryGraph();
        drawVariablesOnPrimaryGraph();
      }

      // return this layer's variables to the bin
      Layer.get(layer_id).datasets().each(function() {
        jQuery("#gl_tabber_variables ul.variablestab li a[href='#"+this.id+"']")
          .removeClass("inUse");
      });

      jQuery("#layer_set .graph#"+layer_id).remove();

      // pick a layer to highlight instead
      layer_id = getLayers().last()[0].id

      drawLayersTab(layer_id);
      drawLayer(layer_id);
      jQuery("div#gl_tabber a#Layers").click();

      if( getLayers().length == 1 )
        jQuery("div.layer_actions input[value='Delete']")
            .attr("disabled", "disabled");
      set_bookmark();
    });

    /* clicking the layer name will rename it */
    jQuery("h3.layertitle").click(function() {
      var layer_id = jQuery(this).attr("name");
      var recursive_validation_loop = function() {
        var layer_name = prompt("You can rename your layer. What'll it be?");
        if( !layer_name || !layer_name.trim() ) {
          return Layer.get(layer_id).text();
        }
        if( Layer.existsWithName(layer_name) ) {
          alert("A layer by that name already exists. Please try again.");
          return recursive_validation_loop();
        }
        return layer_name;
      };

      var layer_name = recursive_validation_loop();
      Layer.get(layer_id).setName(layer_name);
      drawLayersTab(layer_id);
      jQuery(this).text(layer_name);
      if( jQuery("#main_graph_title").attr("class") == layer_id ) {
        jQuery("#main_graph_title").text(layer_name);
      }
      drawLayersOnPrimaryGraph();
    });

    jQuery("div.createbox a").click(function() {
      var recursive_validation_loop = function() {
        var layer_id = "layer_" + Math.floor(Math.random(100)*100);
        if( Layer.exists(layer_id) ) {
          return recursive_validation_loop();
        }
        return layer_id;
      };

      var layer_id = recursive_validation_loop();
      new_layer(layer_id);
      drawLayersTab(layer_id);
      drawLayer(layer_id);
      jQuery("div#gl_tabber a#Variables").click();

      jQuery("div.layer_actions input[value='Delete']").removeAttr("disabled");
    });

    /* clicking a layer in the list of layers on the graph will highlight that layer */
    jQuery("#mg_layers ul.layerstab li a").live("click", function() {
      var layer_id = jQuery(this).attr("href").substr(1);
      toggleSupHighlight("primary", layer_id);

      jQuery("#mg_varlegend ul#legend li a")
          .parent("li").removeClass("highlight");
      Layer.get(layer_id).datasets().each(function() {
        jQuery("#mg_varlegend ul#legend li a[href='#"+this.id+"']")
          .parent("li").addClass("highlight");
      });

      jQuery("#mg_layers .layerstab li")
          .removeClass("highlight");
      jQuery("#mg_layers .layerstab li a[href='#"+layer_id+"']")
          .parent("li").addClass("highlight");
    });

    /* clicking a checkbox in the list of layers on the primary graph will toggle that layer's visibility */
    jQuery("#layers_in_graph form#mg_layers ul.layerstab input[type=checkbox]").live("change", function() {
      var layer_id = jQuery("#mg_layers .layerstab li.highlight input").attr("name");
      drawPrimaryGraph(false, layer_id);
    });

    /* clicking a variable in the list of variables on the graph will highlight that variable's layer */
    jQuery("#mg_varlegend ul#legend li a").live("click", function() {
      var var_id = jQuery(this).attr("href").substr(1);
      var layer_id = Dataset.get(var_id).layer().id;
      toggleSupHighlight("primary", layer_id);

      jQuery("#mg_layers .layerstab li")
          .removeClass("highlight");

      jQuery("#mg_layers .layerstab li a[href='#"+layer_id+"']")
          .parent("li").addClass("highlight");

      jQuery("#mg_varlegend ul#legend li a")
          .parent("li").removeClass("highlight");
      Layer.get(layer_id).datasets().each(function() {
        jQuery("#mg_varlegend ul#legend li a[href='#"+this.id+"']")
          .parent("li").addClass("highlight");
      });
    });

    /* clicking a layer in the layer-bin will activate that layer in the workspace */
    jQuery("#gl_tabber_layers ul.layerstab li a").live("click", function() {
      var layer_id = jQuery(this).attr("href").substr(1);
      drawLayer(layer_id);
      highlightLayerInTab(layer_id);
      jQuery("div#gl_tabber a#Variables").click();
    });

    /* clicking a variable that's in use will activate its layer in the workspace */
    jQuery("#gl_tabber_variables ul.variablestab li a.inUse").live("click", function() {
      var var_id = jQuery(this).attr("href").substr(1);
      var layer_id = Dataset.get(var_id).layer().id
      drawLayer(layer_id);
      highlightLayerInTab(layer_id);
      jQuery("div#gl_tabber a#Layers").click();
    });

    /* double-clicking an unused variable in the bin will add that variable to the layer */
    jQuery("#gl_tabber_variables ul.variablestab li a").dblclick(function() { if( !jQuery(this).hasClass("inUse") ) { add_this_variable.call(this); } });
    add_this_variable = function() {
      var self = this;
      var var_id = jQuery(self).attr("href").substr(1);
      var layer_id = jQuery("h3.layertitle").attr("name");

      var addToLayer = function() {
        Layer.get(layer_id).add_dataset(var_id);
        drawLayer(layer_id);
        highlightLayerInTab(layer_id);

        jQuery(self).addClass("inUse");

        set_bookmark();
      };

      var loader = new DrawWhenReady(0, function() { }, addToLayer);
      var url = url_builder(var_id);
      loader.load(var_id, url);
    };

    /* double-clicking a variable in the layer_variables legend will remove it */
    jQuery("div#legendbox ul#legend li a").live("dblclick", function() {
      var var_id = jQuery(this).attr("href").substr(1);
      var layer_id = jQuery("h3.layertitle").attr("name");
      Layer.get(layer_id).remove_dataset(var_id);
      drawLayer(layer_id);

      jQuery("#gl_tabber_variables ul.variablestab li a[href='#"+var_id+"']")
          .removeClass("inUse");

      set_bookmark();
    });

  set_bookmark();
});
};
