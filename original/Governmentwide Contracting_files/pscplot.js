
// selector should be 
function plotPSC() {


    var margin = {top: 30, right: 0, bottom: 50, left: 20};
    var height = 450;
    var width = 250;

    var gcolors = {
      'Defense': "var(--primary)",
      'Civilian': "var(--secondary)"
    };
    
    var xextra = 2;
    var g1;
    var g1_type;
    var g2;
   
    

    // the default is to use Civilian as g1 and Defense as g2
    // if a filter is applied, we use the selected dept as g1
    // and either civilian or defense as g2

    if(currentFilter == "None") {
      g1 = "Civilian";
      g2 = "Defense";
      g1_type = 'Civilian';
      
      // set header
      d3.select(".fig2_g1_title").text("Total Civilian Agencies");
      d3.select(".fig2_g2_title").text("Total Defense Agencies");
      
    } else {
      g1 = currentFilter;
      g2 = dod_civLU[currentFilter];
      g1_type = g2;
      d3.select(".fig2_g1_title").text(g1 + " Total");
      d3.select(".fig2_g2_title").text("Total " + g2 + " Agencies");
    };

    var g1services = pscTop5Data.filter(d => d.dept==g1 && d.psc_type=='SERVICE');
    var g1_svctotal = pscTotalsData.filter(d => d.dept==g1 && d.psc_type=='SERVICE'); 
    var g1products = pscTop5Data.filter(d => d.dept==g1 && d.psc_type=='PRODUCT');
    var g1_prodtotal = pscTotalsData.filter(d => d.dept==g1 && d.psc_type=='PRODUCT'); 
    var g2services = pscTop5Data.filter(d => d.dept==g2 && d.psc_type=='SERVICE');
    var g2_svctotal = pscTotalsData.filter(d => d.dept==g2 && d.psc_type=='SERVICE'); 
    var g2products = pscTop5Data.filter(d => d.dept==g2 && d.psc_type=='PRODUCT');
    var g2_prodtotal = pscTotalsData.filter(d => d.dept==g2 && d.psc_type=='PRODUCT'); 


    // Set title to include department/agency and defense/civilian
    d3.select(".g1_top5_title")
      .text("Top 5 " + g1 + " Services and Products");

    d3.select(".g2_top5_title")
      .text("Top 5 " + g2 + " Services and Products");

    // Set total services for g1
    d3.select(".fig2_g1_svc_value")
      .text("$" + formatNum(pscTotalsData.filter(d => d.dept==g1 && d.psc_type=='SERVICE')[0]['obs']/1000000000))
      ;

    // Set total products for g1
    d3.select(".fig2_g1_prod_value")
      .text("$" + formatNum(pscTotalsData.filter(d => d.dept==g1 && d.psc_type=='PRODUCT')[0]['obs']/1000000000))
      ;

    // Set total services for g2
    d3.select(".fig2_g2_svc_value")
      .text("$" + formatNum(pscTotalsData.filter(d => d.dept==g2 && d.psc_type=='SERVICE')[0]['obs']/1000000000));

    // Set total products for g2
    d3.select(".fig2_g2_prod_value")
      .text("$" + formatNum(pscTotalsData.filter(d => d.dept==g2 && d.psc_type=='PRODUCT')[0]['obs']/1000000000));

    var maxval = Math.max(d3.max(g1services.map(d => d.obs)), 
                          d3.max(g1products.map(d => d.obs)),
                          d3.max(g2services.map(d => d.obs)), 
                          d3.max(g2products.map(d => d.obs))
                          );

    // set the ranges
    var x = d3.scaleBand()
            .range([0, width])
            .domain([0, 1, 2, 3, 4])
            .paddingInner(0.4)
            .align(0.5);

    var bandwidth = x.bandwidth();

    var y = d3.scaleLinear()
            .range([height - margin.top, 0])
            .domain([0, maxval]);

    function addPlot(tgt, data, gtype) {
      var svg = d3.select(tgt + "_bar");
      var psclist = d3.select(tgt + "_list");

      var barColor;
      if (gtype == "Defense") {
        barColor = "var(--primary)";
      } else {
        barColor = "var(--secondary)"
      }

      // remove existing svg if there is one
      svg.selectAll("svg").remove();

      svg.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      // add a group for each psc
      var bars = svg.select("g")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g");

      // add a rectangle for the bar chart
      bars.append("rect")
        .attr("x", function(d, i) { return (bandwidth + xextra)*i; })
        .attr("width", bandwidth)
        .attr("y", function(d) { return y(d.obs); })
        .attr("height", function(d) { return height - y(d.obs); })
        .attr("fill", d => gcolors[d.dept] || "var(--accent)")
        ;
      // add the value above each bar
      bars.append("text")
          .attr("x", function(d, i) { return ((bandwidth + xextra)*i)+2; })
          .attr("y", function(d) { 
            // really small number cause values to overlap numbers
            var calc_pos = y(d.obs) - 5;
            
            return Math.min(calc_pos, 400); 
          })
          .text(d => {
            if (d.obs < 1000000000) {
              return "$" + formatNum(d.obs/1000000000, 2)
            } else {
              return "$" + formatNum(d.obs/1000000000, 1)
            }})
          .attr("class", "bar_labels");

      // add the number below each bar
      bars.append("text")
          .attr("x", function(d, i) { return ((bandwidth + xextra)*i)+10; })
          .attr("y", height - margin.top - 5)
          .text(function(d, i) {return i + 1;})
          .attr("fill", d => {
            
            if (d.dod_civ == 'Defense') {
              return "white";
            } else {
              return "black";
            }
          })
          .attr("class", "bar_labels");

      var pscFriendly = {'OPER OF GOVT R&D GOCO FACILITIES': 'OPER OF GOVT R&D GOVT OWNED CONTRACTOR OPERATED FACILITIES'}

      // now add list of values below the bar charts
      psclist.selectAll("ol").remove();
      psclist.append("ol");
      var vals = psclist.selectAll("ol")
        .selectAll("li")
        .data(data)
        .enter()
        .append("li")
        .text(d => {
          let val = pscFriendly[d.psc_desc] ?? d.psc_desc;
          //console.log(val);
          return initialCaps(d.psc_desc);
        });
    };


    addPlot(".fig2_g1_svc", g1services, g1_type);
    addPlot(".fig2_g1_prod", g1products, g1_type);
    addPlot(".fig2_g2_svc", g2services, g2);
    addPlot(".fig2_g2_prod", g2products, g2);

    var fig2_dl = d3.select(".fig2_dl");

    fig2_dl.on('mouseover', d => fig2_dl.style('background-color', 'white'))
      .on('mouseout', d => fig2_dl.style('background-color', 'var(--bglight)'))
      .on("click", d => download(csvmaker(pscTotalsData), 'psc.csv'));

}