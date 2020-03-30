The New York Times county-by-county COVID-19 spread dataset seems like a perfect match for (bivariate) chloropleth rendering. 

This block is able to show data from a particular day, and can show that data as absolute numbers or as per-capita data on a county-by-county basis. The Times data tracks cases and deaths, and the application calculates daily rates of these by first order finite difference.  
 
This is a “bivariate” rendering derived from https://observablehq.com/@d3/bivariate-choropleth:  Two measures are shown at once by mixing colors on a gray-to-blue scale with colors on a gray-to-orange scale, as shown in the legend on the lower right.  (Hover over a color swatch to see the value range for that color.)  By default, the data is colored by quantiles, which will accentuate low values.  
 
Toggling the “Thresholds” button will change the coloring to use even intervals between the minimum and maximum values of a measure for the selected day.  (In threshold coloring, the only region with any intense coloring right now will be New York City…)   Click on a label in the legend to change the measure being mapped to that axis’ color.
 
