/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
	// Constants for sizing
	var width = window.innerWidth;
	if(width < 900) {
		width = 900;
	}
	var useWidth = 4 * width / 5;
	var height = window.innerHeight-275;
	if(height < 475) {
		height = 475;
	}
	var useHeight = 20+height/2;
	console.log("width: " + width + " height: " + height);

	// tooltip for mouseover functionality
	var tooltip = floatingTooltip('gates_tooltip', 240);
	// Sizes bubbles based on their area instead of raw radius
	var radiusScale = d3.scale.pow().exponent(0.5).range([2, 85]);
	var bigSize = 5;
	var smallSize = 5;
	//console.log(radiusScale(+500000) * width/screen.availWidth + " " + radiusScale(+100000) * width/screen.availWidth);
	// Locations to move bubbles towards, depending
	// on which view mode is selected.
	var center = { x: width / 2, y: useHeight };

	var collegeCenters = {
		"Social and Behavioral Science": { x: width / 10 + useWidth / 5, y: useHeight},
		"Humanities": { x: width / 10 + 2 * useWidth / 5, y: useHeight},
		"Fine Arts": { x: width / 10 + 3 * useWidth / 5, y: useHeight},
		"Other": { x: width / 10 + 4 * useWidth / 5, y: useHeight}
	}

	var fundingCenters = {
		"Provost": { x: width/10 + useWidth/4, y: useHeight },
		"State": { x: width/10 + useWidth / 2, y: useHeight },
		"RDI": { x: width/10 + 3*useWidth/4, y: useHeight }
	};	

	var collegeCenters = {
		"Social and Behavioral Science": { x: width / 10 + useWidth / 5, y: useHeight},
		"Humanities": { x: width / 10 + 2 * useWidth / 5, y: useHeight},
		"Fine Arts": { x: width / 10 + 3 * useWidth / 5, y: useHeight},
		"Other": { x: width / 10 + 4 * useWidth / 5, y: useHeight}
	}

	// locations of the titles.
	var collegeTitles = {
		"Social and Behavioral Science": width / 10 + useWidth / 5 - 2*useWidth/30,
		"Humanities": width / 10 + 2 * useWidth / 5 + useWidth/40,
		"Fine Arts": width / 10 + 3 * useWidth / 5 + useWidth/20,
		"Other": width / 10 + 4 * useWidth / 5 + 2*useWidth/30
	}

	var fundingTitlesX = {
		"Provost": width/4,
		"State": width / 2,
		"RDI": 3*width/4
	};

	// totals
	var collegeTotal = {
		"Social and Behavioral Science": 1340601,
		"Humanities": 864942,
		"Fine Arts": 297668,
		"Other": 93092
	}

	var fundingTotal = {
		"Provost": 1185421+290891,
		"State": 237728+815263,
		"RDI": 67000
	}

	// Used when setting up force and
	// moving around nodes
	var damper = 0.102;

	// These will be set in create_nodes and create_vis
	var svg = null;
	var bubbles = null;
	var nodes = [];

	// Charge function that is called for each node.
	// Charge is proportional to the diameter of the
	// circle (which is stored in the radius attribute
	// of the circle's associated data.
	// This is done to allow for accurate collision
	// detection with nodes of different sizes.
	// Charge is negative because we want nodes to repel.
	// Dividing by 8 scales down the charge to be
	// appropriate for the visualization dimensions.
	function charge(d) {
		return -Math.pow(d.radius, 2.0) / 8;
	}

	// Here we create a force layout and
	// configure it to use the charge function
	// from above. This also sets some contants
	// to specify how the force layout should behave.
	// More configuration is done below.
	var force = d3.layout.force()
		.size([width, height])
		.charge(charge)
		.gravity(-0.01)
		.friction(0.9);


	// Nice looking colors - no reason to buck the trend
	var fillColor = d3.scale.ordinal()
		.domain(['Director’s Discretionary Award', 'Innovation Farm Grant', 'Faculty Collaboration Grant', 'Graduate Fellowship', 'UA 1885 / UA Excellence Award'])
		.range(['#13b2cb', '#879295', '#1e5288', '#ef4056','#ab0520']);
	/*
	 * This data manipulation function takes the raw data from
	 * the CSV file and converts it into an array of node objects.
	 * Each node will store data and visualization values to visualize
	 * a bubble.
	 *
	 * rawData is expected to be an array of data objects, read in from
	 * one of d3's loading functions like d3.csv.
	 *
	 * This function returns the new node array, with a node in that
	 * array for each element in the rawData input.
	 */
	function createNodes(rawData) {
		// Use map() to convert raw data into node data.
		// Checkout http://learnjsdata.com/ for more on
		// working with data.
		var myNodes = rawData.map(function (d) {
			bigSize = radiusScale(+250000) * width/screen.availWidth * 2;
			smallSize = radiusScale(+100000) * width/screen.availWidth * 2;
			return {
				id: d.id,
				radius: radiusScale(+d.amount) * width/screen.availWidth,
				value: d.amount,
				college: d.college,
				grant: d.grant,
				from: d.from,
				x: Math.random() * 900,
				y: Math.random() * 800
			};
		});
		// sort them to prevent occlusion of smaller nodes.
		myNodes.sort(function (a, b) { return b.value - a.value; });
		return myNodes;
	}

	/*
	 * Main entry point to the bubble chart. This function is returned
	 * by the parent closure. It prepares the rawData for visualization
	 * and adds an svg element to the provided selector and starts the
	 * visualization creation process.
	 *
	 * selector is expected to be a DOM element or CSS selector that
	 * points to the parent element of the bubble chart. Inside this
	 * element, the code will add the SVG continer for the visualization.
	 *
	 * rawData is expected to be an array of data objects as provided by
	 * a d3 loading function like d3.csv.
	 */
	var chart = function chart(selector, rawData) {
		// Use the max total_amount in the data as the max in the scale's domain
		// note we have to ensure the total_amount is a number by converting it
		// with `+`.
		var maxAmount = d3.max(rawData, function (d) { return +d.amount; });
		radiusScale.domain([0, maxAmount]);

		nodes = createNodes(rawData);

		// set legend circle sizes
		document.getElementById('big').style.width = bigSize + "px";
		document.getElementById('big').style.height = bigSize + "px";
		document.getElementById('small').style.width = smallSize + "px";
		document.getElementById('small').style.height = smallSize + "px";
		document.getElementById('25Label').style.marginTop = (3 * bigSize / 4 - (smallSize/2 + 12)) + "px";
		document.getElementById('1Label').style.marginTop = (smallSize / 2 + 12) + "px";

		// Set the force's nodes to our newly created nodes array.
		force.nodes(nodes);

		// Create a SVG element inside the provided selector
		// with desired size.
		svg = d3.select(selector)
			.append('svg')
			.attr('width', width)
			.attr('height', height);

		// Bind nodes data to what will become DOM elements to represent them.
		bubbles = svg.selectAll('.bubble')
			.data(nodes, function (d) { return d.id; });

		// Create new circle elements each with class `bubble`.
		// There will be one circle.bubble for each object in the nodes array.
		// Initially, their radius (r attribute) will be 0.
		bubbles.enter().append('circle')
			.classed('bubble', true)
			.attr('r', 0)
			.attr('fill', function (d) { return fillColor(d.grant); })
			.attr('stroke', function (d) { return d3.rgb(fillColor(d.grant)).darker(); })
			.attr('stroke-width', 2)
			.on('mouseover', showDetail)
			.on('mouseout', hideDetail);

		// Fancy transition to make bubbles appear, ending with the
		// correct radius
		bubbles.transition()
			.duration(2000)
			.attr('r', function (d) { return d.radius; });

		// Set initial layout to single group.
		groupBubbles();
	};



	function hideAll(){
		svg.selectAll('.college').remove();
		svg.selectAll('.collegeAmt').remove();
		svg.selectAll('.funding').remove();
		svg.selectAll('.fundingAmt').remove();
		svg.selectAll('.amount').remove();
	}

	/*
	 * Sets visualization in "single group mode".
	 * The labels are hidden and the force layout
	 * tick function is set to move all nodes to the
	 * center of the visualization.
	 */
	function groupBubbles() {
		hideAll();
		svg.append('text')
			.attr('class', 'amount')
			.attr('x', width/2)
			.attr('y', 35)
			.attr('text-anchor', 'middle')
			.text(function(d){ return 'Total: $' + addCommas(2596303)});
		force.on('tick', function (e) {
			bubbles.each(moveToCenter(e.alpha))
				.attr('cx', function (d) { return d.x; })
				.attr('cy', function (d) { return d.y; });
		});

		force.start();
	}

	/*
	 * Helper function for "single group mode".
	 * Returns a function that takes the data for a
	 * single node and adjusts the position values
	 * of that node to move it toward the center of
	 * the visualization.
	 *
	 * Positioning is adjusted by the force layout's
	 * alpha parameter which gets smaller and smaller as
	 * the force layout runs. This makes the impact of
	 * this moving get reduced as each node gets closer to
	 * its destination, and so allows other forces like the
	 * node's charge force to also impact final location.
	 */
	function moveToCenter(alpha) {
		return function (d) {
			d.x = d.x + (center.x - d.x) * damper * alpha;
			d.y = d.y + (center.y - d.y) * damper * alpha;
		};
	}

	/*
	 * Sets visualization in "split by X mode".
	 * The labels are shown and the force layout
	 * tick function is set to move nodes to the
	 * center of their data's X.
	 */
	function splitBubbles() {
		hideAll();
		showColleges();
		force.on('tick', function (e) {
			bubbles.each(moveToColleges(e.alpha))
				.attr('cx', function (d) { return d.x; })
				.attr('cy', function (d) { return d.y; });
		});

		force.start();
	}

	function splitBubblesByFunding() {
		hideAll();
		showFunding();
		force.on('tick', function (e) {
			bubbles.each(moveToFunding(e.alpha))
				.attr('cx', function (d) { return d.x; })
				.attr('cy', function (d) { return d.y; });
		});

		force.start();
	}

	function transitionToReturn() {
		hideAll();
		force.on('tick', function (e) {
			bubbles.each(moveToReturn(e.alpha))
				.attr('cx', function (d) { return d.x; })
				.attr('cy', function (d) { return d.y; });
		});
		// setTimeout(function(){
  //   		svg.selectAll('.bubble').remove();
		// }, 2000);
		force.start();
	}

	/*
	 * Positioning is adjusted by the force layout's
	 * alpha parameter which gets smaller and smaller as
	 * the force layout runs. This makes the impact of
	 * this moving get reduced as each node gets closer to
	 * its destination, and so allows other forces like the
	 * node's charge force to also impact final location.
	 */
	function moveToColleges(alpha){
		return function (d) {
			var target = collegeCenters[d.college];
			d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
			d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
		};
	}

	function moveToFunding(alpha){
		return function (d) {
			var target = fundingCenters[d.from];
			d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
			d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
		};
	}

	function moveToReturn(alpha){
		return function (d) {
			if(d.grant === 'Faculty Collaboration Grant'){
				d.x = d.x + (center.x - d.x) * damper * alpha;
				d.y = d.y + (center.y - d.y) * damper * alpha;
			}
			else if(d.college === 'Social and Behavioral Science' || d.college === 'Other'){
				d.x = d.x + (-300 - d.x) * damper * alpha;
				d.y = d.y + (center.y - d.y) * damper * alpha;
			}
			else if(d.college === 'Humanities' || d.college === 'Fine Arts'){
				d.x = d.x + (window.innerWidth + 300 - d.x) * damper * alpha;
				d.y = d.y + (center.y - d.y) * damper * alpha;
			}
		};
	}

	function splitBig(){
		return function (d) {
			if(d.grant === 'Faculty Collaboration Grant'){
				d.remove();
			}
		};
	}

	function showColleges(){
		var collegesData = d3.keys(collegeTitles);
		var colleges = svg.selectAll('.college').data(collegesData);
		colleges.enter().append('text')
			.attr('class', 'college')
			.attr('x', function (d) { return collegeTitles[d]; })
			.attr('y', 35)
			.attr('text-anchor', 'middle')
			.text(function(d){ return d.replace('and', '&'); });
		colleges.enter().append('text')
			.attr('class', 'collegeAmt')
			.attr('x', function (d) { return collegeTitles[d]; })
			.attr('y', 60)
			.attr('text-anchor', 'middle')
			.text(function(d){ return '$' + addCommas(collegeTotal[d])});
	}

	function showFunding(){
		var fundingData = d3.keys(fundingTitlesX);
		var sources = svg.selectAll('.from').data(fundingData);
		sources.enter().append('text')
			.attr('class', 'funding')
			.attr('x', function (d) { return fundingTitlesX[d]; })
			.attr('y', 35)
			.attr('text-anchor', 'middle')
			.text(function(d){ return d; });
		sources.enter().append('text')
			.attr('class', 'fundingAmt')
			.attr('x', function (d) { return fundingTitlesX[d]; })
			.attr('y', 60)
			.attr('text-anchor', 'middle')
			.text(function(d){ return '$' + addCommas(fundingTotal[d]) });
	}

	/*
	 * Function called on mouseover to display the
	 * details of a bubble in the tooltip.
	 */
	function showDetail(d) {
		// change outline to indicate hover state.
		d3.select(this).attr('stroke', 'black');
		var abbreviation = {
			'Fine Arts':'CFA',
			'Humanities':'COH',
			'Social and Behavioral Science':'SBS',
			'Other': 'Other'
		}
		var content = '<span class="name">' + abbreviation[d.college] + '</span><br/><br/>' +
						'<span class="name">' + d.grant + '</span><br/><br/>' +
						'<span class="amount">$' + addCommas(d.value) + '</span>';
		tooltip.showTooltip(content, d3.event);
	}

	/*
	 * Hides tooltip
	 */
	function hideDetail(d) {
		// reset outline
		d3.select(this)
			.attr('stroke', d3.rgb(fillColor(d.grant)).darker());

		tooltip.hideTooltip();
	}

	/*
	 * Externally accessible function (this is attached to the
	 * returned chart function). Allows the visualization to toggle
	 * between "single group" and "split by X" modes.
	 *
	 * displayName is expected to be a string.
	 */
	chart.toggleDisplay = function (displayName) {
		if (displayName === 'college') {
			splitBubbles();
		} else if(displayName === 'from'){
			splitBubblesByFunding();
		} else if(displayName === 'return'){
			transitionToReturn();
		} else {
			groupBubbles();
		}
	};

	// return the chart function from closure.
	return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
	if (error) {
		console.log(error);
	}

	myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
	d3.select('#toolbar')
		.selectAll('.button')
		.on('click', function () {
			// Remove active class from all buttons
			d3.selectAll('.button').classed('active', false);
			// Find the button just clicked
			var button = d3.select(this);

			// Set it as the active button
			button.classed('active', true);

			// Get the id of the button
			var buttonId = button.attr('id');

			// Toggle the bubble chart based on
			// the currently clicked button.
			myBubbleChart.toggleDisplay(buttonId);
		});
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}

	return x1 + x2;
}

function resize(){
	myBubbleChart = bubbleChart();
}

// Load the data.
d3.csv('data/spending.csv', display);

// setup the buttons.
setupButtons();
