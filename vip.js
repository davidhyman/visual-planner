SHOW_MONTHS = 16;
LOOK_BACK = 1;

var CELLWIDTH = 120;
var CELLHEIGHT = 16;
var EVENTSIZE = 10;
var FONTSIZE = "8pt";
var TODAY;
var CLR_TODAY = "#ffff80";
var CLR_TEXT = "#000000";
var CLR_TEXT_PAST = "#808080";
var CLR_WEEKDAY = "#eaeaea";
var CLR_WEEKEND = "#d8d8d8";
var CLR_WEEKDAY_SEL = "#ffffae";
var CLR_WEEKEND_SEL = "#ebeb9e";
var event_req_dates;
var next_event_req;
var selection_cell_start;
var selection_cell_end;

// disable default selection behaviour
document.body.style.webkitUserSelect = "none"; // ch
document.body.style.MozUserSelect = "none"; // ff
document.body.onselectstart = function(){return false}; // ie
document.body.style.cursor = "default";

function init_view(view)
{
	var now = new Date();
	TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	var vip = document.getElementById("vip");
	vip.innerHTML = "";
	vip.appendChild(create_div(0, 0, "month_hdr"));
	vip.appendChild(create_div(0, 0, "grid"));
	vip.appendChild(create_div(0, 0, "event_overlay"));
	vip.appendChild(create_div(0, 0, "select_tip"));

	event_req_dates = [];
	selection_cell_start=null;
	selection_cell_end=null;

	var prefs = new gadgets.Prefs();

	if (view == "panel")
	{
		vip.appendChild(create_div(0, 0, "indicator_overlay"));

		gadgets.window.adjustHeight();

		if (prefs.getBool("show_single_col"))
			create_single_col_view();
	}
	else if (view == "canvas")
	{
		if (gadgets.views.getParams()["content"] == "settings")
		{
			gadgets.window.setTitle("ViP : Settings");
			return;
		}

		create_multi_col_view();

		//window.addEventListener('keydown', onkeydown, true);
	}

	window.addEventListener('mousedown', onmousedown, true);
	window.addEventListener('mousemove', onmousemove, true);
	window.addEventListener('mouseup', onmouseup, true);

	google.calendar.subscribeToDates(update_cal_dates);
	google.calendar.subscribeToDataChange(update_cal_events);
	update_cal_events();
}

function toggle_single_col()
{
	var prefs = new gadgets.Prefs();
	prefs.set("show_single_col", prefs.getBool("show_single_col") ? "false" : "true");

	init_view("panel");
}

function create_single_col_view()
{
	var dt_start = new Date(TODAY);
	var offset = (TODAY.getDay()==0 ? 6 : TODAY.getDay() - 1);
	dt_start.setDate(TODAY.getDate() - offset);  // monday this week

	var dt_end = new Date(dt_start);
	dt_end.setDate(dt_end.getDate()+28);

	// save dates for event retrieval
	event_req_dates.push({start:google.calendar.utils.fromDate(dt_start), end:google.calendar.utils.fromDate(dt_end)});

	create_col(22, 26, dt_start, dt_end, 0);
	gadgets.window.adjustHeight(26 + (28*CELLHEIGHT));
}

function create_multi_col_view()
{
	// reset dimensions depending on available space
	CELLHEIGHT = Math.floor(window.innerHeight/(31+6+1));  // max days + max offset + month name
	if (CELLHEIGHT < 8) CELLHEIGHT = 8;
	CELLWIDTH = Math.floor(window.innerWidth/SHOW_MONTHS);
	if (CELLWIDTH < 60) CELLWIDTH = 60;
	EVENTSIZE = (CELLHEIGHT-6);
	if (EVENTSIZE < 4) EVENTSIZE = 4;
	FONTSIZE = fmt("^pt", Math.floor(CELLHEIGHT/2));

	var dt_month = new Date(TODAY);
	dt_month.setDate(1);  // 1st of this month
	dt_month.setMonth(dt_month.getMonth()-LOOK_BACK);  // offset

	var dt_end = new Date(dt_month);
	dt_end.setMonth(dt_end.getMonth()+SHOW_MONTHS);

	var xpos=0;
	var col_id=0;
	while (dt_month.getTime() < dt_end.getTime())
	{
        var mth = create_div(xpos, 0);
        mth.vipMonthHeader = {year:dt_month.getFullYear(), month:dt_month.getMonth()+1};
        mth.setAttribute('onclick', "onclick_month_header(event);");
        mth.style.width = CELLWIDTH;
        mth.style.fontSize = FONTSIZE;
        mth.style.textAlign = "center";
        mth.style.color = CLR_TEXT;
        mth.style.cursor = "pointer";

		var dt_array = dt_month.toDateString().split(' ');
		var str = fmt("^  ^", dt_array[1], dt_array[3]);
		mth.appendChild(document.createTextNode(str));

		document.getElementById("month_hdr").appendChild(mth);

		var dt_next = new Date(dt_month);
		dt_next.setMonth(dt_next.getMonth()+1);  // next month

		// save dates for event retrieval
		var evt_start = google.calendar.utils.fromDate(dt_month);
		var evt_end = google.calendar.utils.fromDate(dt_next);
		event_req_dates.push({start:evt_start, end:evt_end});
		
		var ypos = ((CELLHEIGHT * dt_month.getDay()) + CELLHEIGHT);  // offset + month name
		create_col(xpos, ypos, dt_month, dt_next, col_id);

		dt_month.setTime(dt_next.getTime());
		xpos += CELLWIDTH;
		col_id++;
	}
}

function create_col(xpos, ypos, start_date, end_date, col_id)
{
	grid = document.getElementById("grid");
	var x=xpos;
	var y=ypos;

	var dt_day = new Date(start_date);
	while (dt_day.getTime() < end_date.getTime())
	{
		create_cell(x, y, dt_day, col_id, grid);

		dt_day.setDate(dt_day.getDate()+1);
		y += CELLHEIGHT;
	}
}

function create_cell(xpos, ypos, dt_day, col_id, grid)
{
	var year = dt_day.getFullYear();
	var month = dt_day.getMonth()+1;
	var day = dt_day.getDate();
	var day_in_week = dt_day.getDay();

	var cell = create_div(xpos, ypos, fmt("^-^-^", year, month, day));
	cell.vipCell = {year:year, month:month, day:day};
	cell.vipCell.datestamp = dt_day.getTime();
	cell.vipCell.col_id = col_id;
	cell.style.width = CELLWIDTH-1;
	cell.style.height = CELLHEIGHT-1;
	cell.vipCell.clr_default = (day_in_week==0 || day_in_week==6) ? CLR_WEEKEND : CLR_WEEKDAY;
	cell.vipCell.clr_selected = (day_in_week==0 || day_in_week==6) ? CLR_WEEKEND_SEL : CLR_WEEKDAY_SEL;
	cell.style.backgroundColor = cell.vipCell.clr_default;

	var num = create_div(0,0);
	num.vipNum = {};
	num.style.width = CELLHEIGHT;
	num.style.textAlign = "center";
	num.style.fontSize = FONTSIZE;
	num.style.cursor = "pointer";
	num.style.color = (dt_day < TODAY) ? CLR_TEXT_PAST : CLR_TEXT;
	num.setAttribute('onclick', "onclick_day_number(event);");
	num.appendChild(document.createTextNode(dt_day.getDate()));

	if (dt_day.getDate() == TODAY.getDate())
	if (dt_day.getMonth() == TODAY.getMonth())
	if (dt_day.getFullYear() == TODAY.getFullYear())
	{
		num.style.fontWeight = "bold";
		num.style.color = "white";
		num.style.backgroundColor = "red";
	}

	cell.appendChild(num);
	grid.appendChild(cell);
}

function create_div(x, y, id)
{
	var div = document.createElement('div');

	if (id)
		div.id = id;

	div.style.position = "absolute";
	div.style.left = x;
	div.style.top = y;

	div.style.MozUserSelect = "none";  // ff fix

	return div;
}

function get_cell(dt)
{
	return document.getElementById(fmt("^-^-^", dt.getFullYear(), dt.getMonth()+1, dt.getDate()));
}


/////////////////////////////////////////////////////////////////
// calendar event handlers

function update_cal_dates(dates)
// callback when user changes calendar date range
{
	ind_overlay = document.getElementById("indicator_overlay");
	if (!ind_overlay)
		return;
		
	ind_overlay.innerHTML = "";  // clear current indicator

	var start_date = google.calendar.utils.toDate(dates.startTime);
	var end_date = google.calendar.utils.toDate(dates.endTime);

	// calculate dimensions of indicator
	var cell=null;
	var ind_left=null;
	var ind_top=null;
	var ind_bottom=null;
	while (start_date.getTime() <= end_date.getTime())
	{
		if (!cell)
			cell = get_cell(start_date);

		if (cell)
		{
			if (!ind_left) ind_left = cell.offsetLeft;
			if (!ind_top) ind_top = cell.offsetTop;
			ind_bottom = (cell.offsetTop + cell.offsetHeight);
			
			cell = cell.nextSibling;
		}

		start_date.setDate(start_date.getDate()+1);
	}

	// create indicator bar
	if (ind_left && ind_top && ind_bottom)
	{
		var ind = create_div(ind_left+18, ind_top);
		ind.style.width = 2;
		ind.style.height = (ind_bottom-ind_top);
		ind.style.backgroundColor = "#a0a0a0";
		ind_overlay.appendChild(ind);
	}
}

function update_cal_events()
// callback when calendar events have changed
{
	evt_overlay = document.getElementById("event_overlay");
	evt_overlay.innerHTML = "";  // clear current events

	next_event_req = 0;
	request_events();
}

function request_events()
{
	if (next_event_req < event_req_dates.length)
	{
		var date_range = event_req_dates[next_event_req];
		google.calendar.read.getEvents(receive_events, "selected", date_range.start, date_range.end);
		next_event_req++;
	}
}

function receive_events(data)
// callback when event data received
{
	for (var j in data)
	{
		cal_data = data[j];

		if (cal_data.error)
		{
			alert(fmt("ViP encountered error retrieving event data : ^", cal_data.error));
			return;
		}
		
		// draw new events
		for (var k in cal_data.events)
		{
			var event = cal_data.events[k];

			if (event.allDay)
				draw_all_day_event(event);
			else
				draw_timed_event(event);
		}
	}

	request_events();
}

function draw_all_day_event(event)
{
	var start = google.calendar.utils.toDate(event.startTime);
	var end = google.calendar.utils.toDate(event.endTime);

	while (start.getTime() < end.getTime())
	{
		var cell = get_cell(start);

		if (cell)
		{
			// lookup existing all-day event element, if present
			var all = null;
			var lyr = document.getElementById("event_overlay");  // event layer
			var leftmost = (cell.offsetLeft + cell.offsetWidth)-2;
			for (var i=0; i < lyr.childNodes.length; i++)
			{
				var evt_element = lyr.childNodes[i];
				if (evt_element.vipAllDayEvent)  // is it an all-day event ?
				if (evt_element.vipAllDayEvent.col_id == cell.vipCell.col_id)  // is it in the same column as the cell ?
				{
					if (evt_element.vipAllDayEvent.evt_id == event.id)  // is it the same event ?
						all = evt_element;

					if (evt_element.offsetLeft < leftmost)
						leftmost = evt_element.offsetLeft;  // save position of left-most element
				}
			}

			// create if not found
			if (!all)
			{
				all = create_div((leftmost - 5), cell.offsetTop);
				all.vipAllDayEvent = {col_id:cell.vipCell.col_id, evt_id:event.id};
				all.style.width = 5;
				all.setAttribute("title", event.title);

				var bar = create_div(1, 0);  // create colour bar
				bar.style.width = 3;
				bar.style.height = "100%";
				bar.style.backgroundColor = event.palette.medium;

				all.appendChild(bar);
				lyr.appendChild(all);
			}

			all.style.height = ((cell.offsetTop + cell.offsetHeight) - all.offsetTop);
		}

		start.setDate(start.getDate()+1);
	}
}

function draw_timed_event(event)
{
	var lyr = document.getElementById("event_overlay");  // event layer
	var evt_date = google.calendar.utils.toDate(event.startTime);
	var evt_timestamp = evt_date.getTime();
	var evt_cell = get_cell(evt_date);

	if (!evt_cell)
		return;

	var off_x = (evt_cell.offsetLeft + (CELLHEIGHT + 6));
	var off_y = (evt_cell.offsetTop + 2);

	// lookup existing timed event elements on the same day
	for (var i=0; i < lyr.childNodes.length; i++)
	{
		var evt_element = lyr.childNodes[i];

		if (evt_element.vipTimedEvent)  // is it a timed event ?
		if (evt_element.vipTimedEvent.cell == evt_cell)  // is it the same day ?
		{
			if (evt_element.vipTimedEvent.timestamp > evt_timestamp)  // is it later than the new event ?
				evt_element.style.left = evt_element.offsetLeft + (EVENTSIZE + 2);  // offset it one place right
			else
				off_x += (EVENTSIZE + 2);  // offset the new event
		}
	}

	// create new event element
	var tmd = create_div(off_x, off_y);
	tmd.style.height = EVENTSIZE;
	tmd.style.width = EVENTSIZE;
	tmd.style.cursor = "default";
	tmd.style.backgroundColor = event.palette.medium;
	var fmtstr = fmt("^:^ ^", (event.startTime.hour < 10) ? "0^" : "^", (event.startTime.minute < 10) ? "0^" : "^", "^");
	tmd.setAttribute("title", fmt(fmtstr, event.startTime.hour, event.startTime.minute, event.title));  // tooltip
	tmd.vipTimedEvent = {cell:evt_cell, timestamp:evt_timestamp};

	lyr.appendChild(tmd);
}


/////////////////////////////////////////////////////////////////
// mouse/keyboard event handlers

/*
function onkeydown(event)
{
	var clicks=0;

	switch (event.which)
	{
		case 37:  // back
		case 38:  // up
			clicks = -1;
			break;
		case 39:  // right
		case 40:  // down
			clicks = 1;
			break;
	}

	scroll_grid(clicks);

	event.returnValue=false;
}
*/

function onclick_day_number(event)
{
	var cell = event.target.parentNode;

	if (cell.vipCell)
		google.calendar.showDate(cell.vipCell.year, cell.vipCell.month, cell.vipCell.day);
}

function onclick_month_header(event)
{
    var cell = event.target;

    if (cell.vipMonthHeader)
    {
        var date_str = fmt((cell.vipMonthHeader.month < 10) ? "^0^01" : "^^01", cell.vipMonthHeader.year, cell.vipMonthHeader.month);
        var url = fmt("https://www.google.com/calendar/render?date=^&mode=month", date_str);
        window.top.location.replace(url);
    }
}

function onmousedown(event)
{
	if (event.target.vipNum)
		return;
		
	show_selection(false);

	var cell = get_target_cell(get_event_pt(event));
	
	if (cell)
	{
		selection_cell_start = cell;
		selection_cell_end = cell;
		show_selection(true);
	}
}

function onmousemove(event)
{
	if (!selection_cell_start)
		return;

	var cell = get_target_cell(get_event_pt(event));
	
	if (!cell)
		return;
	
	if (cell != selection_cell_end)  // has the selection changed ?
	{
		show_selection(false);
		selection_cell_end = cell;
		show_selection(true);
	}
}

function onmouseup(event)
{
	if (!selection_cell_start)
		return;

	if (confirm("Create new event for the selected dates ?"))
		create_calendar_event();

	show_selection(false);
	selection_cell_start=null;
	selection_cell_end=null;
}

function create_calendar_event()
{
	var date_end = new Date(selection_cell_end.vipCell.datestamp);
	date_end.setDate(date_end.getDate() + 1);  // end date is exclusive

	var event =
	{
		allDay: true,
		startTime: {year: selection_cell_start.vipCell.year, month: selection_cell_start.vipCell.month, date: selection_cell_start.vipCell.day},
		endTime: {year: date_end.getFullYear(), month: date_end.getMonth()+1, date: date_end.getDate()}
	};

	google.calendar.composeEvent(event);
}

function show_selection(show)
{
	if (!selection_cell_start) return;
	if (!selection_cell_end) return;

	var lyr = document.getElementById("select_tip");
	lyr.innerHTML = "";

	var sel_start = selection_cell_start.vipCell.datestamp < selection_cell_end.vipCell.datestamp ? selection_cell_start : selection_cell_end;
	var sel_end = selection_cell_start.vipCell.datestamp > selection_cell_end.vipCell.datestamp ? selection_cell_start : selection_cell_end;
	var c=0;
	while (sel_start)
	{
		sel_start.style.backgroundColor = show ? sel_start.vipCell.clr_selected : sel_start.vipCell.clr_default;
		c++;
		
		if (sel_start == sel_end)
			break;

		sel_start = sel_start.nextSibling;
	}

	if (show)
	if (c > 1)
	{
		tip = create_div(selection_cell_end.offsetLeft+40, selection_cell_end.offsetTop-24);
		tip.style.height = 16;
		tip.style.width = 60;
		tip.style.border = "thin solid black";
		tip.style.fontSize = 9;
		tip.style.lineHeight = 1.8;  // vertical center
		tip.style.textAlign = "center";
		tip.style.color = "black";
		tip.style.background = "yellow";
		tip.style.cursor = "default";

		var w = Math.floor(c/7);
		var d = (c-(w*7));
		var txt;
		if (w==0) txt=fmt("^d", c);
		else if (d==0) txt=fmt("^d (^w)", c, w)
		else txt=fmt("^d (^w ^d)", c, w, d);

		tip.innerHTML = txt;

		lyr.appendChild(tip);
	}
}

function get_target_cell(pt)
// returns the cell element at the specified point
{
	var element = document.elementFromPoint(pt.x, pt.y);

	if (!element)
		return null;

	if (element.vipCell)
		return element;

	return null;
}

function get_event_pt(event)
// returns point the event occurred at
{
	var pt = {x:null, y:null};

	if (event.x) pt.x = event.x;  // ch
	if (event.y) pt.y = event.y;  // ch
	if (event.clientX) pt.x = event.clientX;  // ff
	if (event.clientY) pt.y = event.clientY;  // ff

	return pt;
}


/////////////////////////////////////////////////////////////////
// utility functions

function fmt(fmtspec)
// returns string consisting of format specification with '^' placeholders
// replaced in sequence by any parameters supplied
{
	var str = "";
	var arg=1;
	for (var i in fmtspec)
	{
		if (fmtspec[i] == '^')
		{
			if (arg < arguments.length)
			{
				str += arguments[arg];
				arg++;
			}
		}
		else
		{
			str += fmtspec[i];
		}
	}

	return str;
}
