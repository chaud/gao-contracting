function mouseout() {
    var tooltip = d3.select(".tooltip");
      tooltip.transition()
         .duration(500)
         .style("opacity", 0);
};

function mouseover(d="Coming Soon") {
    var tooltip = d3.select(".tooltip");

    tooltip.transition()
        .duration(200)
        .style("opacity", .9);
    tooltip.html(d);
}

function mousemove() {
   
    d3.select(".tooltip")
      .style("top", (event.pageY + 10) + "px")
      .style("left", (event.pageX + 25) + "px")
      ;
    
};

function groupBy(data, props, keep=false) {

  var dept_vals = [];
  
  // get values for defense/civilian
  var outer = Object.values(data.reduce((acc,curr)=>{
    var group = props.map(k => curr[k]);

    // if there is only one key, just use that value. otherwise use the list of keys
    var k;
    if (props.length == 1) {
        k = group[0];
    } else {
        k = group;
    }
    
    // if key group doesn't exist, create it with 0 for value
    acc[group] = acc[group] || {'key': k, 'value': 0};
    
    // add current row obligations
    acc[group]['value'] += curr['obs'];

    return acc;

  }, {}));

  // get agency if specified

  if(keep) {
    var dept_data = data.filter(d => d['dept']==keep);
    

    dept_vals = Object.values(dept_data.reduce((acc,curr)=>{
      var group = [...[keep],...props.slice(1).map(k => curr[k])];

      // if there is only one key, just use that value. otherwise use the list of keys
        var k;
        if (props.length == 1) {
            k = group[0];
        } else {
            k = group;
        }

      // if key group doesn't exist, create it with 0 for value
      acc[group] = acc[group] || {'key': k, 'value': 0};
      
      // add current row obligations
      acc[group]['value'] += curr['obs'];

      return acc;

    }, {}))
    //console.log(dept_vals);
    
  } 

  return [...outer, ...dept_vals];

  
};



function groupBy1(arr, groupKeys, keep=false){
  return Object.values(
      arr.reduce((acc,curr)=>{
        // If keep is specified, we pull out that department
        var group;
        
        if(keep) {
            // we want to keep the given department, otherwise use DOD/Civilian
            group = groupKeys.map(k => {
                if((k == 'dod_civ') && (curr['dept'] == keep)) {
                    return curr['dept'];
                } else {
                    return curr[k];
                }
            });
           
            
        } else {
          // otherwise just group by the given properties
          group = groupKeys.map(k => curr[k]);
  
        };
        
        // if there is only one key, just use that value. otherwise use the list of keys
        var k;
        if (groupKeys.length == 1) {
            k = group[0];
        } else {
            k = group;
        }
  
        // if key group doesn't exist, create it with 0 for value
        acc[group] = acc[group] || {'key': k, 'value': 0};
        
        // add current row obligations
        acc[group]['value'] += curr['obs'];
           
        return acc;
      }, {})
    );
  };
  
  function csvmaker(jsonData) {
    
    // Empty array for storing the values
    csvRows = [];
  
    // Headers is the object key
    const headers = Object.keys(jsonData[0]);

    var heads = headers.join(',').replace('obs','Total Obligations (in dollars)');
    heads = heads.replace('dod_civ', 'DOD or Civilian').replace('dept','Agency or Department');
    heads = heads.replace('psc_type', 'Product or Service').replace('co_size','Business Size');
    heads = heads.replace('pricing', 'Contract Pricing').replace('competed','Competition');
    
  
    // As for making csv format, headers must
    // be separated by comma and pushing it
    // into array
    csvRows.push(heads);
  
    // Pushing Object values into array
  
    jsonData.forEach(row => {

        var row_vals = Object.values(row);
        var obs = row_vals.pop();

        var new_vals = row_vals + ',"' + [obs.toLocaleString('en-US')] + '"';

        csvRows.push(new_vals);
        
    });
  
    // Returning the array joining with new line 
    return csvRows.join('\n')
  };
  
  function download(csvData, file='download.csv') {
    
    // Create a blob and pass in the data
    const blob = new Blob([csvData], { type: 'text/csv' });
  
    // Create a URL object
    const url = window.URL.createObjectURL(blob)
  
    // Create an HTML anchor tag
    const a = document.createElement('a')
  
    // Pass the blob as url
    a.setAttribute('href', url)
  
    // Set the anchor tag attribute and pass the download file name
    a.setAttribute('download', file);
  
    // Performing a download with click
    a.click()
  };
  
var cap_skips = ["R&D", "GOCO", "IT"]


function initialCaps(val) {   
    str = val[0].toUpperCase() + val.substr(1).toLowerCase();
    str = str.replace("r&d", "R&D");
    str = str.replace("goco","Govt owned contractor oper");
    str = str.replace("It ","IT ");
    str = str.replace(" it "," IT ");
    str = str.replace("govt","Govt");
    return str;    

};


function formatNum(val, decimals=0) {

  return val.toFixed(decimals).toLocaleString();
}

