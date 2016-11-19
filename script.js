var margin = {top: 20, right: 30, bottom: 40, left: 30},
    width = 1500 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

var svg = d3.select("#chart")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], 0.1);

var y = d3.scale.linear()
    .range([0, height]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickSize(0)
    .tickPadding(6);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

// Define linear scale for output
var color = d3.scale.linear()
    .domain([0,1,4])
    .range(["#d95f0e","#fff7bc","#2ca25f"]);

var rat_lookup = {};
var d_lookup = {};
var data_vote;
var data_map;
var my_state = state;
var my_vpc   = 1;


function type(d) {
  d.vpc = +d.vpc;
  //    console.log("Found " + d.vpc + " " + d.state );
  return d;
}


function init() {
  // state ecv population vpc
  d3.tsv("data.tsv", type, function(error, data) {
    data_vote = data;
    x.domain(data.map(function(d) { return d.state; }));
    y.domain([4,0]);

    svg.append("line")
      .attr("x1", width)
      .attr("x2", width)
      .attr("y1", y(0))
      .attr("y2", y(4))
      .attr("stroke", "grey");

    svg.selectAll(".guide")
      .data([1,2,3,4])
      .enter().append("line")
      .attr("class", "guide")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", function(d){return y(d)})
      .attr("y2", function(d){return y(d)})
      .attr("stroke", "grey");

    svg.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.state); })
      .attr("y", y(0))
      .attr("width", x.rangeBand())
      .attr("height",0)
      .on('click', function(d,i){ update(d.state); })
      .append("text");

    svg.selectAll(".barlabel")
      .data(data)
      .enter().append("text")
      .attr("class","barlabel")
      .attr("text-anchor","middle")
      .attr("x", function(d) { return x(d.state) + x.rangeBand()/2; })
      .attr("y", y(0));

    // highlight rectangle
    svg.append("rect")
      .attr("class", "highlight")
      .attr("id", "highlight");

    d3.select("#highlight")
      .attr("x", x("TX")) // start at TX
      .attr("y", 0)
      .attr("width",  x.rangeBand())
      .attr("height", height + 50);

    // plot guides
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(0,0)")
      .call(yAxis);

    svg.append("line")
      .attr("class", "x axis")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(0))
      .attr("y2", y(0))
      .attr("stroke-width", 1)
      .attr("stroke", "black");

    // set current state
    update("DC");

  });
}

/////////////////////////

var map_height=500;

//Create SVG element and append map to the SVG
var map_svg = d3.select("#map")
    .attr("width", 1500)
    .attr("height", map_height);

// D3 Projection
var projection = d3.geo.albersUsa()
  .translate([width/2, map_height/2])    // translate to center of screen
  .scale([1000]);          // scale things down so see entire US

// Define path generator
var path = d3.geo.path()      // path generator that will convert GeoJSON to SVG paths
  .projection(projection);  // tell path generator to use albersUsa projection

d3.json("us-states.json", function(data) {
  data_map = data;
  map_svg.selectAll("path")
    .data(data_map.features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("stroke", "#000")
    .style("stroke-width", "1")
    .style("fill", color(0))
    .on("click", function(d,i) {
      update(d.properties.short_name);
    })
    .on("mouseover", function(d) {
      var e = d_lookup[d.properties.short_name];
      d3.select("#state").text("" + d.properties.name);
      d3.select("#selstate").text("" + my_state);
      d3.select("#population").text(e.population);
      d3.select("#votes").text(e.ecv);
      d3.select("#rat").text(e.rat);
      d3.select("#tooltip")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY - 28) + "px");

    });
  update_map();
});

function update_map(state) {
  if (!data_map) { return; }
  map_svg.selectAll("path")
    .data(data_map.features)
    .style("fill", function(d) {
      if (d.properties.short_name == state) {
        return "#333";
      } else {
        return color(rat_lookup[d.properties.short_name]);
      }
    });
};

function update_chart(state) {
  data = data_vote;

  var duration = 750;
  svg.selectAll(".bar").data(data)
    .transition().duration(duration)
    .attr("y", function(d) { return y(Math.max(0, d.rat)); })
    .attr("height", function(d) { return Math.abs(y(d.rat) - y(0)); })
    .style("fill", function(d) { return color(d.rat); });

  var labeld = 10;
  svg.selectAll(".barlabel").data(data)
    .attr("y", height + 30)
    .text(function(d) {
      return (d.rat > 0 ? "+" : "-") + (Math.abs(d.rat)).toFixed(1);
    });

  d3.select("#highlight")
    .transition().duration(duration)
    .attr("x", x(state));
}

function update_data(state) {
  data = data_vote;
  // normalize for a state! take parameter from click event!
  my_state = state;
  my_vpc   = 1;
  data.map(function(d) {
    if (my_state == d.state) {
      my_vpc = d.vpc;
    }
  });

  data.map(function(d){
    d.rat = my_vpc/d.vpc;
    rat_lookup[d.state] = d.rat;
    d_lookup[d.state] = d;
  });
}

function update(state) {
  update_data(state);
  update_chart(state);
  update_map(state);
  d3.select("#title").text(state);
}


init();
