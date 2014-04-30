//# dc.js Getting Started and How-To Guide
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

// ### Create Chart Objects
// Create chart objects assocated with the container elements identified by the css selector.
// Note: It is often a good idea to have these objects accessible at the global scope so that they can be modified or filtered by other page controls.
var rolesOfResponsibilityChart = dc.pieChart("#roles-of-responsibility-chart");
var totalAssessmentReportsChart = dc.barChart("#total-assessment-report-chart");
var distinctRolesChart = dc.pieChart("#distinct-roles-chart");
var workingGroupsChart = dc.rowChart("#working-groups-chart");
var chaptersChart = dc.lineChart("#chapters-chart");
var assessmentReportsChart = dc.barChart("#assessment-reports-chart");
var countryGroupsChart = dc.bubbleChart("#country-groups-chart");

// ### Anchor Div for Charts
/*
// A div anchor that can be identified by id
    <div id="your-chart"></div>
// Title or anything you want to add above the chart
    <div id="chart"><span>Days by Gain or Loss</span></div>
// ##### .turnOnControls()
// If a link with css class "reset" is present then the chart
// will automatically turn it on/off based on whether there is filter
// set on this chart (slice selection for pie chart and brush
// selection for bar chart). Enable this with `chart.turnOnControls(true)`
     <div id="chart">
       <a class="reset" href="javascript:myChart.filterAll();dc.redrawAll();" style="display: none;">reset</a>
     </div>
// dc.js will also automatically inject applied current filter value into
// any html element with css class set to "filter"
    <div id="chart">
        <span class="reset" style="display: none;">Current filter: <span class="filter"></span></span>
    </div>
*/

//### Load your data
//Data can be loaded through regular means with your
//favorite javascript library
//
//```javascript
//d3.csv("data.csv", function(data) {...};
//d3.json("data.json", function(data) {...};
//jQuery.getJson("data.json", function(data){...});
//```
d3.tsv("ipcc-authors.tsv", function (data) {

  // from nada (CC0)
  /*
    Identity Function: return the given argument

    Parameter:
      value - any value

    Returns:
      the same value provided as parameter
  */
  function identity( value ) {
    return value;
  }

  // from nada (CC0)
  /*
    Run given function for each item in given array,
    including items with null and undefined values

    Parameters:
      array - array, the array to iterate
      callback - function( item, offset ), the callback called at each offset,
                 with the item value and current offset provided as arguments.
                 If the callback returns true, the iteration is interrupted and
                 following items will not be processed.

    Returns:
      boolean, true when the iteration has been interrupted by a callback,
      false otherwise

    Notes:
    * items are processed in ascending order of offset, from 0 to the initial
    length of the array at the time of the call to forEach()
    * in case items are deleted, updated or inserted, the current value of each
    item at the current offset at the time of the call to the callback will be
    provided to the callback
  */
  function forEach( array, callback ) {
    var
      isBreak = false,
      i,
      length = array.length;

    for ( i = 0; i < length && !isBreak ; i++ ){
      isBreak = callback( array[ i ], i ) === true;
    }

    return isBreak;
  }

  // from nadasurf (CC0)
  /*
    Apply a function to all the elements in a list

    Parameters:
      array - array, the list of items to process
      operation - function( value, offset ), the function to apply to each item,
                  called with the value and offset of each item. The result of
                  the operation is stored at the same offset in result array.

    Returns:
      array, the list of results of the operation applied to each item
      of the given array.
  */
  function map( array, operation ) {
    var result = Array( array.length );

    forEach( array, function( item, i ) {
      result[ i ] = operation( item, i );
    });

    return result;
  }

  // from nada (CC0)
  /*
    Wrap a function in a closure that configures given object as context

    Parameters:
      func - function, the function to wrap
      object - object, the object to provide as 'this' for the function

    Returns:
      function, a closure that calls the given function with provided parameters,
      with the given object configured as 'this', and returns the same value.

    Note:
    This function calls the apply() method of the given function, and its
    behavior changes depending on whether the function is in strict mode.

    When the provided function is not in strict mode:

      1) a null argument for context object defaults to the global object
      2) automatic boxing of arguments is performed

      Reference:
      https://developer.mozilla.org/en-US/docs/JavaScript/Reference
        /Functions_and_function_scope/Strict_mode#.22Securing.22_JavaScript
  */
  function bind( func, object ) {
    return function() {
      return func.apply( object, arguments );
    };
  }

  // from nadasurf (CC0)
  /*
    Define an alias for a (Native prototype) function

    The alias allows to call the function with the context object
    as first argument, followed with regular arguments of the function.

    Example:
      var has = alias( Object.prototype.hasOwnProperty );
      has( object, name ) === object.hasOwnProperty( name ); // true

    Parameter:
      func - function, a method part of the prototype of a Constructor

    Dependency:
      nada/bind.js
  */
  function alias( func ) {
    return bind( func.call, func );
  }

  // from nadasurf (CC0)
  var hasOwnProperty = alias( Object.prototype.hasOwnProperty );

  // from nadasurf (CC0)
  /*
    Run given function for each property of given object matching the filter,
    skipping inherited properties

    Parameters:
      object - object, the object to iterate
      callback - function( value, name ): boolean, the callback called for each
                 property owned by the object (not inherited), with property
                 value and name provided as arguments.

    Notes:
      * properties are iterated in no particular order
      * whether properties deleted or added during the iteration are iterated
        or not is unspecified
  */
  function forEachProperty( object, callback ) {
    var
      name,
      value;

    for ( name in object ) {
      if ( hasOwnProperty( object, name ) ) {
        value = object[name];
        callback( value, name );
      }
    }
  }

  function parseContributionCode (contributionCode) {
    var
      parts = contributionCode.split('.'),

      ASSESSMENT_REPORT = 0,
      WORKING_GROUP = 1,
      ROLE = 2,
      INSTITUTION_ID = 3,
      INSTITUTION_COUNTRY_ID = 4,
      CONTRIBUTIONS_NUMBER = 5,

      WORKING_GROUP_NAMES = {
        1: 'I',
        2: 'II',
        3: 'III'
      },

      ROLE_NAMES = {
        1: 'CLA',
        2: 'LA',
        3: 'RE',
        4: 'CA'
      };

    return {
      ar: parts[ASSESSMENT_REPORT],
      wg: WORKING_GROUP_NAMES[ parts[WORKING_GROUP] ],
      role: ROLE_NAMES[ parts[ROLE] ],
      institution: parts[INSTITUTION_ID],
      country: parts[INSTITUTION_COUNTRY_ID],
      // remove 'x' (multiplication sign) before contributions number
      count: Number(parts[CONTRIBUTIONS_NUMBER].slice(1))
    };
  }

  function parseContributions (tsvContributions) {
    // remove starting '[' and ending ']'
    return tsvContributions.slice(1,-1)
      // split items separated by '|'
      .split('|');
  }

  function getWorkingGroups (contributions) {
    var workingGroups = {};
    forEach( contributions, function (contribution) {
      workingGroups[ contribution.wg ] = true;
    });
    return workingGroups;
  }

  function getAssessmentReports (contributions) {
    var assessmentReports = {};
    forEach( contributions, function (contribution) {
      assessmentReports[ contribution.ar ] = true;
    });
    return assessmentReports;
  }

  function countProperties (object) {
    var count = 0;
    forEachProperty( object, function() {
      count++;
    });
    return count;
  }

  /* since its a TSV file we need to format the data a bit */
  data.forEach(function (d) {
    d.name = d.first_name + ' ' + d.last_name;
    d.contribution_codes = parseContributions(d.contributions);
    d.contributions = map(d.contribution_codes, parseContributionCode);
    d.total_contributions = Number(d.total_contributions);
    d.working_groups = getWorkingGroups(d.contributions);
    d.total_working_groups = countProperties(d.working_groups);
    d.assessment_reports = getAssessmentReports(d.contributions);
    d.total_assessment_reports = countProperties(d.assessment_reports);
  });

  //### Create Crossfilter Dimensions and Groups
  //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
  var authors = crossfilter(data);
  var total_authors = authors.size();
  var all = authors.groupAll();

  // utility function to replace the common pattern
  // function (d) {
  //   return d.name;
  // }
  // with
  // getter('name')
  function getter(name) {
    return function (d) {
      return d[name];
    };
  }

  // dimension by author id
  var authorDimension =
    authors.dimension( getter('id') );

  /*
  //#### Data Count
  // Create a data count widget and use the given css selector as anchor. You can also specify
  // an optional chart group for this chart to be scoped within. When a chart belongs
  // to a specific group then any interaction with such chart will only trigger redraw
  // on other charts within the same chart group.
  <div id="data-count">
    <span class="filter-count"></span> selected out of <span class="total-count"></span> records
  </div>
  */
  dc.dataCount(".dc-data-count", "ipcc-authors")
    .dimension(authors)
    .group(all);

  /*
  //#### Data Table
  // Create a data table widget and use the given css selector as anchor. You can also specify
  // an optional chart group for this chart to be scoped within. When a chart belongs
  // to a specific group then any interaction with such chart will only trigger redraw
  // on other charts within the same chart group.
  <!-- anchor div for data table -->
  <div id="data-table">
    <!-- create a custom header -->
    <div class="header">
      <span>Date</span>
      <span>Open</span>
      <span>Close</span>
      <span>Change</span>
      <span>Volume</span>
    </div>
    <!-- data rows will filled in here -->
  </div>
  */
  dc.dataTable(".dc-data-table", "ipcc-authors")
    .dimension(authorDimension)
    .group(function(d){
      return d.total_assessment_reports + " Assessment Reports";
    })
    // display all authors
    .size(total_authors) // (optional) max number of records to be shown, :default = 25
    // dynamic columns creation using an array of closures
    .columns([
      getter('name'),
      getter('total_assessment_reports'),
      getter('total_working_groups'),
      getter('total_contributions'),
      function (d) {
        return d.contribution_codes.join(", ");
      }
    ])
    // (optional) sort using the given field, :default = function(d){return d;}
    .sortBy( getter('total_contributions') )
    // (optional) sort order, :default ascending
    .order(d3.descending)
    // (optional) custom renderlet to post-process chart using D3
    .renderlet(function (table) {
      table.selectAll(".dc-table-group").classed("info", true);
    });

  //#### Rendering
  //simply call renderAll() to render all charts on the page
  // dc.renderAll();
  // or you can render charts belong to a specific chart group
  dc.renderAll("ipcc-authors");
  // once rendered you can call redrawAll to update charts incrementally when data
  // change without re-rendering everything
  // dc.redrawAll();
  // or you can choose to redraw only those charts associated with a specific chart group
  // dc.redrawAll("group");
});

d3.csv("ndx.csv", function (data) {
    /* since its a csv file we need to format the data a bit */
    var dateFormat = d3.time.format("%m/%d/%Y");
    var numberFormat = d3.format(".2f");

    data.forEach(function (d) {
        d.dd = dateFormat.parse(d.date);
        d.month = d3.time.month(d.dd); // pre-calculate month for better performance
        d.close = +d.close; // coerce to number
        d.open = +d.open;
    });

    //### Create Crossfilter Dimensions and Groups
    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(data);
    var all = ndx.groupAll();

    // dimension by year
    var yearlyDimension = ndx.dimension(function (d) {
        return d3.time.year(d.dd).getFullYear();
    });
    // maintain running tallies by year as filters are applied or removed
    var yearlyPerformanceGroup = yearlyDimension.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.absGain += v.close - v.open;
            p.fluctuation += Math.abs(v.close - v.open);
            p.sumIndex += (v.open + v.close) / 2;
            p.avgIndex = p.sumIndex / p.count;
            p.percentageGain = (p.absGain / p.avgIndex) * 100;
            p.fluctuationPercentage = (p.fluctuation / p.avgIndex) * 100;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.absGain -= v.close - v.open;
            p.fluctuation -= Math.abs(v.close - v.open);
            p.sumIndex -= (v.open + v.close) / 2;
            p.avgIndex = p.sumIndex / p.count;
            p.percentageGain = (p.absGain / p.avgIndex) * 100;
            p.fluctuationPercentage = (p.fluctuation / p.avgIndex) * 100;
            return p;
        },
        /* initialize p */
        function () {
            return {count: 0, absGain: 0, fluctuation: 0, fluctuationPercentage: 0, sumIndex: 0, avgIndex: 0, percentageGain: 0};
        }
    );

    // dimension by full date
    var dateDimension = ndx.dimension(function (d) {
        return d.dd;
    });

    // dimension by month
    var moveMonths = ndx.dimension(function (d) {
        return d.month;
    });
    // group by total movement within month
    var monthlyMoveGroup = moveMonths.group().reduceSum(function (d) {
        return Math.abs(d.close - d.open);
    });
    // group by total volume within move, and scale down result
    var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
        return d.volume / 500000;
    });
    var indexAvgByMonthGroup = moveMonths.group().reduce(
        function (p, v) {
            ++p.days;
            p.total += (v.open + v.close) / 2;
            p.avg = Math.round(p.total / p.days);
            return p;
        },
        function (p, v) {
            --p.days;
            p.total -= (v.open + v.close) / 2;
            p.avg = p.days ? Math.round(p.total / p.days) : 0;
            return p;
        },
        function () {
            return {days: 0, total: 0, avg: 0};
        }
    );

    // create categorical dimension
    var gainOrLoss = ndx.dimension(function (d) {
        return d.open > d.close ? "Loss" : "Gain";
    });
    // produce counts records in the dimension
    var gainOrLossGroup = gainOrLoss.group();

    // determine a histogram of percent changes
    var fluctuation = ndx.dimension(function (d) {
        return Math.round((d.close - d.open) / d.open * 100);
    });
    var fluctuationGroup = fluctuation.group();

    // summerize volume by quarter
    var quarter = ndx.dimension(function (d) {
        var month = d.dd.getMonth();
        if (month <= 2)
            return "Q1";
        else if (month > 3 && month <= 5)
            return "Q2";
        else if (month > 5 && month <= 8)
            return "Q3";
        else
            return "Q4";
    });
    var quarterGroup = quarter.group().reduceSum(function (d) {
        return d.volume;
    });

    // counts per weekday
    var dayOfWeek = ndx.dimension(function (d) {
        var day = d.dd.getDay();
        var name=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        return day+"."+name[day];
     });
    var dayOfWeekGroup = dayOfWeek.group();

    //### Define Chart Attributes
    //Define chart attributes using fluent methods. See the [dc API Reference](https://github.com/dc-js/dc.js/blob/master/web/docs/api-1.7.0.md) for more information
    //

    //#### Bubble Chart
    //Create a bubble chart and use the given css selector as anchor. You can also specify
    //an optional chart group for this chart to be scoped within. When a chart belongs
    //to a specific group then any interaction with such chart will only trigger redraw
    //on other charts within the same chart group.
    /* dc.bubbleChart("#country-groups-chart", "chartGroup") */
    countryGroupsChart
        .width(990) // (optional) define chart width, :default = 200
        .height(250)  // (optional) define chart height, :default = 200
        .transitionDuration(1500) // (optional) define chart transition duration, :default = 750
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(yearlyDimension)
        //Bubble chart expect the groups are reduced to multiple values which would then be used
        //to generate x, y, and radius for each key (bubble) in the group
        .group(yearlyPerformanceGroup)
        .colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
        .colorDomain([-500, 500]) //(optional) define color domain to match your data domain if you want to bind data or color
        //##### Accessors
        //Accessor functions are applied to each value returned by the grouping
        //
        //* `.colorAccessor` The returned value will be mapped to an internal scale to determine a fill color
        //* `.keyAccessor` Identifies the `X` value that will be applied against the `.x()` to identify pixel location
        //* `.valueAccessor` Identifies the `Y` value that will be applied agains the `.y()` to identify pixel location
        //* `.radiusValueAccessor` Identifies the value that will be applied agains the `.r()` determine radius size, by default this maps linearly to [0,100]
        .colorAccessor(function (d) {
            return d.value.absGain;
        })
        .keyAccessor(function (p) {
            return p.value.absGain;
        })
        .valueAccessor(function (p) {
            return p.value.percentageGain;
        })
        .radiusValueAccessor(function (p) {
            return p.value.fluctuationPercentage;
        })
        .maxBubbleRelativeSize(0.3)
        .x(d3.scale.linear().domain([-2500, 2500]))
        .y(d3.scale.linear().domain([-100, 100]))
        .r(d3.scale.linear().domain([0, 4000]))
        //##### Elastic Scaling
        //`.elasticX` and `.elasticX` determine whether the chart should rescale each axis to fit data.
        //The `.yAxisPadding` and `.xAxisPadding` add padding to data above and below their max values in the same unit domains as the Accessors.
        .elasticY(true)
        .elasticX(true)
        .yAxisPadding(100)
        .xAxisPadding(500)
        .renderHorizontalGridLines(true) // (optional) render horizontal grid lines, :default=false
        .renderVerticalGridLines(true) // (optional) render vertical grid lines, :default=false
        .xAxisLabel('Index Gain') // (optional) render an axis label below the x axis
        .yAxisLabel('Index Gain %') // (optional) render a vertical axis lable left of the y axis
        //#### Labels and  Titles
        //Labels are displaed on the chart for each bubble. Titles displayed on mouseover.
        .renderLabel(true) // (optional) whether chart should render labels, :default = true
        .label(function (p) {
            return p.key;
        })
        .renderTitle(true) // (optional) whether chart should render titles, :default = false
        .title(function (p) {
            return [p.key,
                   "Index Gain: " + numberFormat(p.value.absGain),
                   "Index Gain in Percentage: " + numberFormat(p.value.percentageGain) + "%",
                   "Fluctuation / Index Ratio: " + numberFormat(p.value.fluctuationPercentage) + "%"]
                   .join("\n");
        })
        //#### Customize Axis
        //Set a custom tick format. Note `.yAxis()` returns an axis object, so any additional method chaining applies to the axis, not the chart.
        .yAxis().tickFormat(function (v) {
            return v + "%";
        });

    // #### Pie/Donut Chart
    // Create a pie chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.

    rolesOfResponsibilityChart
        .width(180) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .radius(80) // define pie radius
        .dimension(gainOrLoss) // set dimension
        .group(gainOrLossGroup) // set group
        /* (optional) by default pie chart will use group.key as it's label
         * but you can overwrite it with a closure */
        .label(function (d) {
            if (rolesOfResponsibilityChart.hasFilter() && !rolesOfResponsibilityChart.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key + "(" + Math.floor(d.value / all.value() * 100) + "%)";
        }) /*
        // (optional) whether chart should render labels, :default = true
        .renderLabel(true)
        // (optional) if inner radius is used then a donut chart will be generated instead of pie chart
        .innerRadius(40)
        // (optional) define chart transition duration, :default = 350
        .transitionDuration(500)
        // (optional) define color array for slices
        .colors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        // (optional) define color domain to match your data domain if you want to bind data or color
        .colorDomain([-1750, 1644])
        // (optional) define color value accessor
        .colorAccessor(function(d, i){return d.value;})
        */;

    distinctRolesChart.width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(quarter)
        .group(quarterGroup);

    //#### Row Chart
    workingGroupsChart.width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split(".")[1];
        })
        // title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    //#### Bar Chart
    // Create a bar chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    /* dc.barChart("#volume-month-chart") */
    totalAssessmentReportsChart.width(420)
        .height(180)
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(fluctuation)
        .group(fluctuationGroup)
        .elasticY(true)
        // (optional) whether bar should be center to its x value. Not needed for ordinal chart, :default=false
        .centerBar(true)
        // (optional) set gap between bars manually in px, :default=2
        .gap(1)
        // (optional) set filter brush rounding
        .round(dc.round.floor)
        .alwaysUseRounding(true)
        .x(d3.scale.linear().domain([-25, 25]))
        .renderHorizontalGridLines(true)
        // customize the filter displayed in the control span
        .filterPrinter(function (filters) {
            var filter = filters[0], s = "";
            s += numberFormat(filter[0]) + "% -> " + numberFormat(filter[1]) + "%";
            return s;
        });

    // Customize axis
    totalAssessmentReportsChart.xAxis().tickFormat(
        function (v) { return v + "%"; });
    totalAssessmentReportsChart.yAxis().ticks(5);

    //#### Stacked Area Chart
    //Specify an area chart, by using a line chart with `.renderArea(true)`
    chaptersChart
        .renderArea(true)
        .width(990)
        .height(200)
        .transitionDuration(1000)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .dimension(moveMonths)
        .mouseZoomable(true)
        // Specify a range chart to link the brush extent of the range with the zoom focue of the current chart.
        .rangeChart(assessmentReportsChart)
        .x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
        .round(d3.time.month.round)
        .xUnits(d3.time.months)
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
        .brushOn(false)
        // Add the base layer of the stack with group. The second parameter specifies a series name for use in the legend
        // The `.valueAccessor` will be used for the base layer
        .group(indexAvgByMonthGroup, "Monthly Index Average")
        .valueAccessor(function (d) {
            return d.value.avg;
        })
        // stack additional layers with `.stack`. The first paramenter is a new group.
        // The second parameter is the series name. The third is a value accessor.
        .stack(monthlyMoveGroup, "Monthly Index Move", function (d) {
            return d.value;
        })
        // title can be called by any stack layer.
        .title(function (d) {
            var value = d.value.avg ? d.value.avg : d.value;
            if (isNaN(value)) value = 0;
            return dateFormat(d.key) + "\n" + numberFormat(value);
        });

    assessmentReportsChart.width(990)
        .height(40)
        .margins({top: 0, right: 50, bottom: 20, left: 40})
        .dimension(moveMonths)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
        .round(d3.time.month.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.months);

    /*
    //#### Geo Choropleth Chart
    //Create a choropleth chart and use the given css selector as anchor. You can also specify
    //an optional chart group for this chart to be scoped within. When a chart belongs
    //to a specific group then any interaction with such chart will only trigger redraw
    //on other charts within the same chart group.
    dc.geoChoroplethChart("#us-chart")
        .width(990) // (optional) define chart width, :default = 200
        .height(500) // (optional) define chart height, :default = 200
        .transitionDuration(1000) // (optional) define chart transition duration, :default = 1000
        .dimension(states) // set crossfilter dimension, dimension key should match the name retrieved in geo json layer
        .group(stateRaisedSum) // set crossfilter group
        // (optional) define color function or array for bubbles
        .colors(["#ccc", "#E2F2FF","#C4E4FF","#9ED2FF","#81C5FF","#6BBAFF","#51AEFF","#36A2FF","#1E96FF","#0089FF","#0061B5"])
        // (optional) define color domain to match your data domain if you want to bind data or color
        .colorDomain([-5, 200])
        // (optional) define color value accessor
        .colorAccessor(function(d, i){return d.value;})
        // Project the given geojson. You can call this function mutliple times with different geojson feed to generate
        // multiple layers of geo paths.
        //
        // * 1st param - geo json data
        // * 2nd param - name of the layer which will be used to generate css class
        // * 3rd param - (optional) a function used to generate key for geo path, it should match the dimension key
        // in order for the coloring to work properly
        .overlayGeoJson(statesJson.features, "state", function(d) {
            return d.properties.name;
        })
        // (optional) closure to generate title for path, :default = d.key + ": " + d.value
        .title(function(d) {
            return "State: " + d.key + "\nTotal Amount Raised: " + numberFormat(d.value ? d.value : 0) + "M";
        });

        //#### Bubble Overlay Chart
        // Create a overlay bubble chart and use the given css selector as anchor. You can also specify
        // an optional chart group for this chart to be scoped within. When a chart belongs
        // to a specific group then any interaction with such chart will only trigger redraw
        // on other charts within the same chart group.
        dc.bubbleOverlay("#bubble-overlay")
            // bubble overlay chart does not generate it's own svg element but rather resue an existing
            // svg to generate it's overlay layer
            .svg(d3.select("#bubble-overlay svg"))
            .width(990) // (optional) define chart width, :default = 200
            .height(500) // (optional) define chart height, :default = 200
            .transitionDuration(1000) // (optional) define chart transition duration, :default = 1000
            .dimension(states) // set crossfilter dimension, dimension key should match the name retrieved in geo json layer
            .group(stateRaisedSum) // set crossfilter group
            // closure used to retrieve x value from multi-value group
            .keyAccessor(function(p) {return p.value.absGain;})
            // closure used to retrieve y value from multi-value group
            .valueAccessor(function(p) {return p.value.percentageGain;})
            // (optional) define color function or array for bubbles
            .colors(["#ccc", "#E2F2FF","#C4E4FF","#9ED2FF","#81C5FF","#6BBAFF","#51AEFF","#36A2FF","#1E96FF","#0089FF","#0061B5"])
            // (optional) define color domain to match your data domain if you want to bind data or color
            .colorDomain([-5, 200])
            // (optional) define color value accessor
            .colorAccessor(function(d, i){return d.value;})
            // closure used to retrieve radius value from multi-value group
            .radiusValueAccessor(function(p) {return p.value.fluctuationPercentage;})
            // set radius scale
            .r(d3.scale.linear().domain([0, 3]))
            // (optional) whether chart should render labels, :default = true
            .renderLabel(true)
            // (optional) closure to generate label per bubble, :default = group.key
            .label(function(p) {return p.key.getFullYear();})
            // (optional) whether chart should render titles, :default = false
            .renderTitle(true)
            // (optional) closure to generate title per bubble, :default = d.key + ": " + d.value
            .title(function(d) {
                return "Title: " + d.key;
            })
            // add data point to it's layer dimension key that matches point name will be used to
            // generate bubble. multiple data points can be added to bubble overlay to generate
            // multiple bubbles
            .point("California", 100, 120)
            .point("Colorado", 300, 120)
            // (optional) setting debug flag to true will generate a transparent layer on top of
            // bubble overlay which can be used to obtain relative x,y coordinate for specific
            // data point, :default = false
            .debug(true);
    */

    //#### Rendering
    //simply call renderAll() to render all charts on the page
    dc.renderAll();
    /*
    // or you can render charts belong to a specific chart group
    dc.renderAll("group");
    // once rendered you can call redrawAll to update charts incrementally when data
    // change without re-rendering everything
    dc.redrawAll();
    // or you can choose to redraw only those charts associated with a specific chart group
    dc.redrawAll("group");
    */
});
