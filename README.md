An interactive graphing tool, using g.raphael and jquery, for exploring
relationships among datasets.  The tool allows you to add multiple
datasets onto a graph with a single (automatic) y-axis scale, and also
allows you to layer an arbitrary number of these graphs, with
different y-axis scales, on top of each other.  A variable can also be
chosen for the x-axis, to draw scatterplots.

This was built for the [Millennium Village Simulation](http://mvsim.com) at [CCNMTL](http://ccnmtl.columbia.edu).

You can try out a demo at [http://ejucovy.github.com/graphtool/sample.html](http://ejucovy.github.com/graphtool/sample.html).

(Some) end-user [instructions are
available](http://mvsim.wikischolars.columbia.edu/Graphing+Tool+Quick+Start+Guide).

Instructions
------------

I'm trying to make it sort of modular and usable in different
contexts.  Right now though it's not so much.

You really need to copy sample.html and all the JS, CSS and images.
Maybe one day it'll be possible to use it in other HTML interfaces. 

You can customize a few things though, about where variables come from.

Variables are fetched from a server as they're needed -- so, for
example, a request to the data server will be made the first time a
user adds the "Amount Wood" variable to a graph, because that variable
isn't stored locally yet.  Within the application, they're stored in
invisible HTML tables after they've been fetched.

You can provide a `url_builder(variable_id)` function which will
return the URL to fetch a variable from. You can also provide a
`table_builder(data, variable_id)` function which will take the data
returned by the server and build an HTML table out of it. See the
default implementations defined in ./js/graph.js, in
VariableLoaderClassFactory, for examples.