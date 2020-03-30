states = null;
data = null;
percapita_data = null;
oldest = null;
newest = null;  
date = null;
xscale = null;
yscale = null;
ncolors = null;
color_scheme = 4;
scale_type = "quantile";
population_by_county = null;
percapita = false;
highways = false;
chartsvg = null;
highways_node = null;

xvar="cases";
yvar="delta_cases";

axis_labels = {"cases" : "Cases",
               "delta_cases": "Daily Case Rate",
               "deaths" : "Deaths",
               "delta_deaths": "Daily Death Rate"};

axis_choices = ["cases", "delta_cases", "deaths", "delta_deaths"];

scale_choices = ["quantile", "threshold"];

next_axis_choice = (choice) => axis_choices[(axis_choices.indexOf(choice)+1) % axis_choices.length];
next_scale_choice = (choice) => scale_choices[(scale_choices.indexOf(choice)+1) % scale_choices.length];

set_title = () => {
    data.title=[axis_labels[xvar],axis_labels[yvar]];
}

d3.selection.prototype.appendHTML = function(HTMLString) {
        return this.select(function() {
            return this.appendChild(document.importNode(new DOMParser().parseFromString(HTMLString, 'text/html').body.childNodes[0], true));
        });
    };

update = (g, date, isInit) => {
    date_data = (percapita) ? percapita_data.get(date) : data.get(date);
    ncolors = Math.floor(Math.sqrt(schemes[color_scheme].colors.length));
    xarray = Array.from(date_data.values(), d => d[xvar]);
    yarray = Array.from(date_data.values(), d => d[yvar]);
    if (scale_type==="quantile") {
        xscale = d3.scaleQuantile(xarray, d3.range(ncolors))
        yscale = d3.scaleQuantile(yarray, d3.range(ncolors));
    } else if (scale_type==="threshold") {
        xextent = d3.extent(xarray);
        DX = (xextent[1]-xextent[0])/(ncolors-1);
        xdomain = d3.range(ncolors).map(n=>xextent[0]+n*DX);
        yextent = d3.extent(yarray);
        DY=(yextent[1]-yextent[0])/(ncolors-1);
        ydomain = d3.range(ncolors).map(n=>yextent[0]+DY*n);
        xscale = d3.scaleThreshold(xdomain, d3.range(ncolors));
        yscale = d3.scaleThreshold(ydomain, d3.range(ncolors));
    }

    g.select("text").text(date);

    if (isInit) {
        g.selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .join("path")
            .attr("stroke", "#eee")
            .attr("stroke-width", 0.25)
            .attr("fill", d => color(date_data.get(d.id)));
    } else {
        g.selectAll("path").attr("fill", d=>color(date_data.get(d.id)));
    }

    if (!isInit) {
        g.selectAll("path title").text(d => `${d.properties.name}, ${states.get(d.id.slice(0, 2)).name} ${format(date_data.get(d.id))}`);
        d3.select("svg#legend").remove();
    } else {
        g.selectAll("path").attr("d", path);        
    }
    l = legend();
    d3.select("div#chart svg").appendHTML(l);
    d3.select("svg#legend g").attr("transform", "translate(775,500)");
    d3.select("text#xlabel").on("click", () => {
        xvar =  next_axis_choice(xvar);
        set_title();
        update(g, date, false);
    });
    d3.select("text#ylabel").on("click", () => {
        yvar =  next_axis_choice(yvar);
        set_title();
        update(g, date, false);
    });
    //d3.selectAll("svg#legend rect").on("click", () => {
    //    scale_type = next_scale_choice(scale_type);
    //    update(g, date, false);                
    //});
    return date_data;    
}

chart = (selector) => {
    const svg = d3.select(selector).append("svg")
        //.attr("height", "90%")
        .attr("viewBox", [0, 0, 975, 610]);
    g = svg.append("g")
      .attr("id", "counties");       

    date_data = update(g,oldest,true);
    
    g.selectAll("path")
        .append("title")
            .text(d => `${d.properties.name}, ${states.get(d.id.slice(0, 2)).name} ${format(date_data.get(d.id))}`);    

    svg.append("g")
        .attr("id","states")
        .append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path);

    g.append("text")
      .attr("x", 425)
      .attr("y", 20)
      .attr("font-family", "sans-serif")
      .text(oldest);

    slider = d3.sliderHorizontal(d3.scaleTime([date_parser(oldest),date_parser(newest)],[0,800]))
        .min(date_parser(oldest))
        .max(date_parser(newest))
        //.silentValue(date_parser(newest))
        .width(800)
        .height(150)
        .displayValue(false)
       .on('onchange', val => {
           newdate = date_formatter(val);
           if (newdate !== date) {         
                update(g,newdate);
                date = newdate;
           }
       });

    d3.select('#slider')
       .append('svg')
       .attr("viewBox", "0 0 975 150")
       //.attr('width', "100%")
       //.attr('height', "10%")
       .append('g')
       .attr('transform', 'translate(35,75)')
       .call(slider);
      
    toggle_percapita = () => {
        percapita = !percapita;
        update(g,date);
    }

    toggle_scale_type = () => {
        scale_type = next_scale_choice(scale_type);
        update(g,date);
    }

    toggle_highways = () => {
        highways = !highways;
        if (highways) {
            d3.selectAll("path.roads").attr("visibility", "visible");
        } else {
            d3.selectAll("path.roads").attr("visibility", "hidden");
        }
    }

    button_toggle = (d) => {
        d.callback();
    }

    button = d3.button()
       .on("press", (d) => button_toggle(d))
       .on("release",(d)=> button_toggle(d))

    d3.selectAll("div.button").append("svg")
       .attr("viewBox", "0 0 200 200")
       .data([{label: "Per Capita", tooltip:"Click to toggle between absolute and per-capita data", 
               callback: toggle_percapita,
               x:100, y:100},
              {label: "Thresholds", tooltip:"Click to toggle between quantiles and thresholds", 
               callback: toggle_scale_type, 
               x:100, y:100},
              {label: "Highways", tooltip:"Click to toggle major and secondary highway display",
               callback: toggle_highways,
               x:100, y:100}])
       .append("g")
       .attr("class", "button")
       .call(button);
    
           
    return svg;
  }

  idcounter=0;
  uid = () => {
      return "id" + idcounter++;
  }

  legend = () => {
    k = schemes[color_scheme].size;
    const arrow = uid();
    xmin = xscale.domain()[0];
    xmax = xscale.domain()[xscale.domain().length-1];
    ymin = yscale.domain()[0];
    ymax = yscale.domain()[yscale.domain().length-1];
    
    if (percapita) {
        xmin = xmin.toExponential(2);
        xmax = xmax.toExponential(2);
        ymin = ymin.toExponential(2);
        ymax = ymax.toExponential(2);
    }

    return `<svg id="legend" viewBox="0 0 700 700"><g font-family=sans-serif font-size=10>
    <g transform="translate(-${k * ncolors / 2},-${k * ncolors / 2}) rotate(-45 ${k * ncolors / 2},${k * ncolors / 2})">
      <marker id="${arrow}" markerHeight=10 markerWidth=10 refX=6 refY=3 orient=auto>
        <path d="M0,0L9,3L0,6Z" />
      </marker>
      ${d3.cross(d3.range(ncolors), d3.range(ncolors)).map(([i, j]) => { 
          xextent = xscale.invertExtent(j);
          yextent = yscale.invertExtent(i);
          qxmin=xextent[0];
          qxmax=xextent[1];
          qymin=yextent[0];
          qymax=yextent[1];
          if (percapita) {
              qxminstr = (qxmin) ? qxmin.toExponential(2) : "*";
              qxmaxstr = (qxmax) ? qxmax.toExponential(2) : "*";
              qyminstr = (qymin) ? qymin.toExponential(2) : "*";
              qymaxstr = (qymax) ? qymax.toExponential(2) : "*";
          } else {
              qxminstr = (qxmin) ? qxmin.toString() : "*";
              qxmaxstr = (qxmax) ? qxmax.toString() : "*";
              qyminstr = (qymin) ? qymin.toString() : "*";
              qymaxstr = (qymax) ? qymax.toString() : "*";
          }
          return `<rect class="legend" width=${k} height=${k} x=${i * k} y=${(ncolors - 1 - j) * k} fill=${schemes[color_scheme].colors[j * ncolors + i]}>
        <title>${data.title[0]}${schemes[color_scheme].labels[j] && ` (${schemes[color_scheme].labels[j]}: ${qxminstr}-${qxmaxstr})`}
        ${data.title[1]}${schemes[color_scheme].labels[i] && ` (${schemes[color_scheme].labels[i]}: ${qyminstr}-${qymaxstr})`}</title>
      </rect>`})}
      <line marker-end="${arrow}" x1=0 x2=${ncolors * k} y1=${ncolors * k} y2=${ncolors * k} stroke=black stroke-width=1.5 />
      <line marker-end="${arrow}" y2=0 y1=${ncolors * k} stroke=black stroke-width=1.5 />
      <text id="xlabel" font-weight="bold" dy="0.71em" transform="rotate(90) translate(${ncolors / 2 * k},6)" text-anchor="middle">
        <title>Click to select a different measure</title>
        <tspan x="0">${data.title[0]}</tspan>
        <tspan x="0" dy="1em">${xmin} - ${xmax}</tspan>
      </text>
      <text id="ylabel" font-weight="bold" dy="0.71em" transform="translate(${ncolors / 2 * k},${ncolors * k + 6})" text-anchor="middle">
        <title>Click to select a different measure</title>
        <tspan x="0">${data.title[1]}</tspan>
        <tspan x="0" dy="1em">${ymin} - ${ymax}</tspan>
      </text>
    </g>
  </g></svg>`;
  }

  date_parser = d3.timeParse("%Y-%m-%d");
  date_formatter = d3.timeFormat("%Y-%m-%d");
  

  schemes = [
    {
      name: "RdBu", 
      size: 24,
      labels: ["low","med","high"],
      colors: [
        "#e8e8e8", "#e4acac", "#c85a5a",
        "#b0d5df", "#ad9ea5", "#985356",
        "#64acbe", "#627f8c", "#574249"
      ]
    },
    {
      name: "BuPu", 
      size: 24,
      labels: ["low","med","high"],
      colors: [
        "#e8e8e8", "#ace4e4", "#5ac8c8",
        "#dfb0d6", "#a5add3", "#5698b9", 
        "#be64ac", "#8c62aa", "#3b4994"
      ]
    },
    {
      name: "GnBu", 
      size: 24,
      labels: ["low","med","high"],
      colors: [
        "#e8e8e8", "#b5c0da", "#6c83b5",
        "#b8d6be", "#90b2b3", "#567994",
        "#73ae80", "#5a9178", "#2a5a5b"
      ]
    },
    {
      name: "PuOr", 
      size: 24,
      labels: ["low","med","high"],
      colors: [
        "#e8e8e8", "#e4d9ac", "#c8b35a",
        "#cbb8d7", "#c8ada0", "#af8e53",
        "#9972af", "#976b82", "#804d36"
      ]
    },
    {
        name: "BenjaminBrooke6",
        size: 12,
        labels: ["lowest","low", "low-medium","medium-high","high","highest"],
        colors: ["#e2dee4", "#bcd5de", "#95cbd7", "#69c1d0", "#38b5c8", "#00a7bf", 
                 "#d8c4c5", "#b4bcc0", "#8fb4ba", "#65aab3", "#36a0ad", "#0093a5", 
                 "#cfaaa4", "#ada3a0", "#889c9c", "#619496", "#348a91", "#00808a", 
                 "#c79085", "#a58a82", "#83847e", "#5d7d7a", "#327575", "#006c70", 
                 "#bd7565", "#9e7063", "#7d6b60", "#58655c", "#2f5f59", "#005855", 
                 "#b35943", "#955541", "#76513f", "#534d3d", "#2d483b", "#004338"]
    }
  ]

  labels = ["low", "med", "high"]

 
  path = d3.geoPath();
  roadpath = d3.geoPath(d3.geoAlbersUsa().scale(1300).translate([487,305]));

  color = (value) => {
      if (!value) return "#ccc";
      yq=yscale(value[yvar]);
      xq=xscale(value[xvar]);
      return schemes[color_scheme].colors[yq + xq * ncolors];
  };

  format = (value) => {
    if (!value) return "N/A";
    xval = value[xvar];
    yval = value[yvar];
    if (percapita) {
        xstr = xval.toExponential(2);
        ystr = yval.toExponential(2);
    } else {
        xstr = xval.toString();
        ystr = yval.toString();
    }
    return `${data.title[0]}: ${xstr} ${schemes[color_scheme].labels[xscale(value[xvar])] &&
         ` (${schemes[color_scheme].labels[xscale(value[xvar])]})`}; ${data.title[1]}: ${ystr} ${schemes[color_scheme].labels[yscale(value[yvar])] &&
             ` (${schemes[color_scheme].labels[yscale(value[yvar])]})`}`;
  }

  fips_map = {"New York City" : ["36081","36047","36085","36005","36061"]}
  
  get_population_data = () => {
    d3.json("./population.json").then((pop_data) => {
        population_by_county = new Map(pop_data.slice(1).map(([population,state,county]) => [state+county,+population]));
        for(special_place in fips_map) {
            counties = fips_map[special_place];
            total_population = counties.reduce((sum,fips) => sum + population_by_county.get(fips),0);
            for(fips in counties) {
                population_by_county[fips] = total_population;
            }
        }
        percapita_data = new Map();
        data.forEach((counties,date) => {
            counties_per_capita = new Map();
            counties.forEach((cdata,fips) => {
                population = population_by_county.get(fips);
                if (population) {
                    pdata = Object.assign({},cdata);
                    pdata.cases = pdata.cases/population;
                    pdata.delta_cases = pdata.delta_cases/population;
                    pdata.deaths = pdata.deaths/population;
                    pdata.delta_deaths = pdata.delta_deaths/population;
                    counties_per_capita.set(fips,pdata);
                }
            });
            percapita_data.set(date,counties_per_capita);
        })
    });
  }
  
  
  d3.json("./counties-albers-10m.json").then((map_data) => {
    us = map_data;
    states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]))
    d3.csv("./us-counties.csv", 
           {headers: {"Cache": "no-cache", "Content-Type": "text/plain; charset=UTF-8"}}).then((rows) => {
    oldest = rows[0].date;
    newest = rows[rows.length-1].date;
    date = oldest;
    data_map = new Map();
    data_map.title=[axis_labels[xvar],axis_labels[yvar]];
    data = rows.reduce((m, {date,county, state,fips,cases,deaths}) => {
        fips_list = [fips];
        if (!fips) {
            fips_list = fips_map[county];
        }
        if (!fips_list) {
            return m;
        }
        fips_list.forEach((fips) => {
            edate = date_parser(date);
            if (!m.get(date)) {
                m.set(date, new Map());
            }
            counties = m.get(date);
            yesterday = date_formatter(edate - 24*3600*1000);
            cases = +cases;
            deaths = +deaths;
            delta_cases = 0;
            delta_deaths = 0;
            if (m.get(yesterday)) {
                ydata = m.get(yesterday);
                if (ydata.get(fips)) {
                    delta_cases = cases - ydata.get(fips).cases;
                    delta_deaths = deaths - ydata.get(fips).deaths;
                } else {
                    delta_cases = cases;
                    delta_deaths = deaths;
                }
            }
            counties.set(fips, {cases: cases, deaths: deaths, delta_cases: delta_cases, delta_deaths:delta_deaths, county: county, state: state, date: date});
        });
        return m;
      }, data_map);
      get_population_data();
      chartsvg = chart("#chart");
      chartresize=()=> {
        height = document.querySelector("div#chart").clientHeight;
        d3.select("div#chart>svg").style("height", height+"px");
      };
      document.querySelector("div#chart svg").addEventListener('resize', chartresize);
      d3.select("div#chart svg").style("height", document.querySelector("div#chart").clientHeight + "px");

      d3.json("./usroads.json").then((usroads) => {
          let highways = topojson.feature(usroads, usroads.objects.roads).features.filter(f => (f.properties.type==="Major Highway" || f.properties.type==="Secondary Highway"));
          chartsvg.append("g")
            .attr("id","highways")
            .selectAll("path")
            .data(highways)
            .enter().append("path")
               .attr("d", roadpath)
               .attr("visibility", "hidden")
               .attr("class",function(d) { return "roads " + d.properties.type.toLowerCase().split(' ').join('-'); });
        });
    }); 
});


