function wrap(val) {
  
  var label = d3.select(this);
  
  if(val=="SMALL BUSINESS") {
    label.append("tspan")
    .text("Small")
    .attr('x', 0)
    .attr('y', 0)
    .attr('dy', 0 + 'em');
    label.append("tspan")
    .text("Business")
    .attr('x', 0)
    .attr('y', 10)
    .attr('dy', 0 + 'em');
    }
  else {
    label.append('tspan')
    .text("Blah");
  }
};


//figure 3
function donutPlot() {

  var margin = {top: 0, right: 30, bottom: 30, left: 30};

  var width = 400;
  var height = 400;
  var svgWidth = width + margin.left + margin.right;
  var svgHeight = height + margin.top + margin.bottom;
  var innerRaw;
  var outerRaw;

  var radius = 200;
  

  g1 = "Defense";
  g2 = "Civilian";

  var gcolors = {
    'Defense': "var(--primary)",
    'Civilian': "var(--secondary)"
  };

  var sortmap = {
    "OTHER THAN SMALL BUSINESS": 1,
    "SMALL BUSINESS": 0,
    "Defense": 10,
    "Civilian": 5
  };


     // the default is to use Civilian as g1 and Defense as g2
    // if a filter is applied, we use the selected dept as g1
    // and either civilian or defense as g2

    var sizeData = coSizeData.filter(d => d['co_size'] != 'BLANK');

    if(currentFilter == "None") {
      g1 = "Defense";
      g2 = "Civilian";

      //innerRaw = groupBy(data, ['dod_civ']).filter(d => inSkips(d.key)).sort((a, b) => sortmap[b.key] - sortmap[a.key]);
      //innerRaw = groupBy(coSizeData, ['dod_civ']).sort((a, b) => {b.key - a.key});
      innerRaw = groupBy(sizeData, ['dod_civ']).sort((a, b) => b.key.localeCompare(a.key));
      
      
      // we want to sort so that dod and other than small come before civilian and small
      //outerRaw = sizeGroup.top(10).sort((a,b) => ((sortmap[b.key[0]] + sortmap[b.key[1]]) - (sortmap[a.key[0]] + sortmap[a.key[1]])));
      outerRaw = groupBy(sizeData, ['dod_civ','co_size']).sort((a,b) => ((sortmap[b.key[0]] + sortmap[b.key[1]]) - (sortmap[a.key[0]] + sortmap[a.key[1]])));
      
    } else {
      g1 = dod_civLU[currentFilter];
      g2 = currentFilter;

      sortmap[g2] = 0;

      innerRaw = groupBy(sizeData.filter(d => d.dod_civ==g1), ['dod_civ'], g2).sort((a, b) => sortmap[b.key] - sortmap[a.key]);
      
      outerRaw = groupBy(sizeData.filter(d => d.dod_civ==g1), ['dod_civ','co_size'], g2).sort((a,b) => ((sortmap[b.key[0]] + sortmap[b.key[1]]) - (sortmap[a.key[0]] + sortmap[a.key[1]])));
      
    };
  
    
  
  var selection = d3.select(".fig3_pie");


  selection.selectAll("svg").remove();

   
  const svg = selection.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", "translate(" + svgWidth / 2 + "," + svgHeight / 2 + ")")
    ;


  var angleGen = d3.pie()
    .value(d => d.value)
    .sort((a) => {if (a.key === 'Defense') {
      return -1;
    } else {
      return 1;
    }});

  var arcGen = d3.arc()
    .innerRadius(radius*.3)
    .outerRadius(radius*.6);


  var inner = angleGen(innerRaw);
  


  var angleGenOuter = d3.pie()
    .value(d => d.value)
    .sort(null)
    ;

  var arcGenOuter = d3.arc()
    .innerRadius(radius*.6)
    .outerRadius(radius*.9)
    ;

  // Just for labels positioning
  var labelArc = d3.arc()
    .innerRadius(radius)
    .outerRadius(radius)


  var defenselist = ['Defense','Army','Navy','Air Force', 'DOD'];

  var outer = angleGenOuter(outerRaw);
  

  var innerRing = svg.append("g")
    .selectAll("path")
    .data(inner)
    .enter()
    .append("path")
    .attr("d", arcGen)
    .attr("fill", d => gcolors[d.data.key] || "var(--accent)")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => mouseover((d.data.key + "<br>$" + formatNum(d.value/1000000000, 1) + "B")))
    .on("mousemove", mousemove)
    .on("mouseout", mouseout)
      ;

    // add text labels to inner ring
    svg.append("g")
      .selectAll('path')
      .data(inner)
      .enter()
      .append('text')
      .text(d => d.data.key)
      .attr("transform", function(d) { return "translate(" + arcGen.centroid(d) + ")";  })
      .style("text-anchor", "middle")
      .style("font-size", 9)
      .style("font-weight", "normal")
      .on("mouseover", (event, d) => mouseover((d.data.key + "<br>$" + formatNum(d.value/1000000000, 1) + "B")))
      .on("mousemove", mousemove)
      .on("mouseout", mouseout)
      .attr("fill", function(d) {
        
        if(defenselist.includes(d.data.key)) {
          return "white";
        } else {
          return "black";
        }})

        ;


  var outerRing = svg.append("g")
    .selectAll("path")
    .data(outer)
    .enter()
    .append("path")
    .attr("d", arcGenOuter)
    .attr("fill", d => gcolors[d.data.key[0]] || "var(--accent)")
    .attr("opacity", "70%")
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .on("mouseover", (event, d) => mouseover((d.data.key[0] + "<br>" + initialCaps(d.data.key[1]) + "<br>$" + formatNum(d.value/1000000000, 1) + "B")))
    .on("mousemove", mousemove)
    .on("mouseout", mouseout)
    ;

    var labelMask = {
      'SMALL BUSINESS': ['Small', 'business'],
      'OTHER THAN SMALL BUSINESS': ['Other than', 'small', 'business'],
      'BLANK': ['Blank']
    };
    


    //add text labels
    var labels = svg.append("g")
      .selectAll('g')
      .data(outer)
      .enter()
      .append('g')
      .on("mouseover", (event, d) => mouseover((d.data.key[0] + "<br>" + initialCaps(d.data.key[1]) + "<br>$" + formatNum(d.value/1000000000, 1) + "B")))
      .on("mousemove", mousemove)
      .on("mouseout", mouseout)
      .attr("transform", function(d) { 
        
        // for small values, we need to make room for the labels. 
        if(d.data.key[1]=="SMALL BUSINESS" && d.data.value < 10000000000) {
          return "translate(" + labelArc.centroid(d) + ")"; 

        } else {
          return "translate(" + arcGenOuter.centroid(d) + ")"; 

        }
      })
        
      .style("fill", function(d) {
           if(defenselist.includes(d.data.key[0])) {
             return "white";
           } else {
             return "black";
           }})
      
      ;

    labels.selectAll("label")
      .data(d => labelMask[d.data.key[1]])
      .enter()
      .append('text')
      .text(d => d)
      .style("font-size", 9)
      .style("text-anchor", "middle")
      .attr('x',0)
      .attr('y', (d, i) => 0 + (10 * i))
      
      ;

      var fig3_dl = d3.select(".fig3_dl");

      fig3_dl.on('mouseover', d => fig3_dl.style('background-color', 'white'))
        .on('mouseout', d => fig3_dl.style('background-color', 'var(--bglight)'))
        .on("click", d => download(csvmaker(coSizeData), 'smallbusiness.csv'));

}