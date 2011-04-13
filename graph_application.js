String.prototype.capitalize = function(){
   return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
};

function render_template(name, context, parent, _callback) {
  alert("foo!");
  alert(name);
  var template = new jugl.Template({
    url: "/static/templates/" + name,
    callback: function(template) {
      var el = template.process({context: context});
      jQuery(parent).empty();
      jQuery(el).appendTo(parent);
      if( _callback ) _callback();
    }});
};

function Variable(id) {
  this.name = id;
  var text = jQuery("#data #"+id).attr("class");
  this.text = text || id.replace(/_/g, " ").capitalize();
  this.color = getColor(id);
};

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
