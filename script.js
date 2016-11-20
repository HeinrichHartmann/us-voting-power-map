var rat_lookup   = {};
var d_lookup     = {};
var state_lookup = {};
var data_vote;
var data_map;
var stateA = "KS";
var stateB = "CA";
var my_vpc   = 1;

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

var margin = {top: 20, right: 30, bottom: 40, left: 30},
    width = 1500 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

var svg = d3.select("#svg-chart")
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


function type(d) {
  d.vpc = +d.vpc;
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
      .on('click', function(d){ update(d.state, stateB); })
      .on("mouseover", function(d) { update(stateA, d.state); })
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
    update(stateA, stateB);
  });
}

/////////////////////////

var map_height = 400;
var map_width = 756;

//Create SVG element and append map to the SVG
var map_svg = d3.select("#svg-map")
    .attr("width", map_width)
    .attr("height", map_height);

// D3 Projection
var projection = d3.geo.albersUsa()
  .translate([map_width/2-60, map_height/2])    // translate to center of screen
  .scale([800]);          // scale things down so see entire US

// Define path generator
var path = d3.geo.path()      // path generator that will convert GeoJSON to SVG paths
  .projection(projection);  // tell path generator to use albersUsa projection

d3.json("us-states.json", function(data) {
  data_map = data;
  data.features.map(function(d) {
    state_lookup[d.properties.short_name] = d.properties.name;
  });

  map_svg.selectAll("path")
    .data(data_map.features)
    .enter()
    .append("path")
    .attr("d", path)
    .style("stroke", "#000")
    .style("stroke-width", "1")
    .style("fill", color(0))
    .on("click", function(d) { update(d.properties.short_name, stateB); })
    .on("mouseover", function(d) { update(stateA, d.properties.short_name); });

  update(stateA, stateB);
});

function update_hover(state){

  update_map(stateA, state);
}

function update_map() {
  if (!data_map) { return; }
  map_svg.selectAll("path")
    .data(data_map.features)
    .style("fill", function(d) {
      if (d.properties.short_name == stateA) {
        return "#333";
      } else {
        return color(rat_lookup[d.properties.short_name]);
      }
    })
    .style("stroke-width",function(d){
      if (d.properties.short_name == stateB) {
        return 2;
      } else {
        return 1;
      }
    });
};

function update_chart() {
  data = data_vote;

  var duration = 750;
  svg.selectAll(".bar").data(data)
    .transition().duration(duration)
    .attr("y", function(d) { return y(Math.max(0, 1/d.rat)); })
    .attr("height", function(d) { return Math.abs(y(1/d.rat) - y(0)); })
    .style("fill", function(d) { return color(d.rat); })
    .style("stroke",function(d){
      if (d.state == stateB) {
        return "black";
      } else {
        return null;
      }
    });

  var labeld = 10;
  svg.selectAll(".barlabel").data(data)
    .attr("y", height + 30)
    .text(function(d) {
        return d.rat.toFixed(1);
    });
  d3.select("#highlight")
    .transition().duration(duration)
    .attr("x", x(stateA));

}

function update_data() {
  data = data_vote;
  // reset VPC
  my_vpc = null;
  data_vote.map(function(d) {
    if (stateA == d.state) {
      my_vpc = d.vpc;
    }
  });
  // update ratios
  data_vote.map(function(d){
    d.rat = my_vpc/d.vpc;
    rat_lookup[d.state] = d.rat;
    d_lookup[d.state] = d;
  });
}

function update_table() {
  var d = d_lookup[stateA];
  var e = d_lookup[stateB];
  d3.selectAll(".A-state").text("" + stateA);
  d3.selectAll(".A-state-full").text("" + state_lookup[stateA]);
  d3.selectAll(".A-population").text(numberWithCommas("" + d.population));
  d3.selectAll(".A-votes").text("" + d.ecv);

  d3.selectAll(".B-state").text("" + stateB);
  d3.selectAll(".B-state-full").text("" + state_lookup[stateB]);
  d3.selectAll(".B-population").text("" + numberWithCommas(e.population));
  d3.selectAll(".B-votes").text(e.ecv);

  d3.selectAll(".rat").text((1/e.rat).toFixed(2));
}

function update(_stateA, _stateB) {
  stateA = _stateA;
  stateB = _stateB;
  update_data();
  update_chart();
  update_map();
  update_table();
}

init();
