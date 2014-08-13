Scalr.utils.Quarters = {

    defaultDays: ['01-01', '04-01', '07-01', '10-01'],

    getDate: function(date, skipClearTime) {
        var res, h = 0, m = 0, s = 0;
        if (Ext.isArray(date)) {
            res = new Date(date[0], date[1], date[2], 0, 0, 0, 0);
        } else if (Ext.isDate(date)) {
            res = date;
        } else if (Ext.isString(date)) {
            var splitDate = date.split(' ');
            splitDate.unshift.apply(splitDate, splitDate[0].split('-'));
            splitDate.splice(3, 1);
            if (splitDate.length > 3) {
                splitDate.push.apply(splitDate, splitDate[3].split(':'));
                splitDate.splice(3, 1);
                h = splitDate[3]*1;
            }
            if (splitDate.length > 4) {
                m = splitDate[4]*1;
            }
            if (splitDate.length > 5) {
                s = splitDate[5]*1;
            }
            res = new Date(splitDate[0]*1, splitDate[1]*1-1, splitDate[2], h, m, s, 0);
        } else {
            res = new Date();
            res = Ext.Date.add(res, Ext.Date.MINUTE, res.getTimezoneOffset());
        }
        if (!skipClearTime) {
            res = Ext.Date.clearTime(res);
        }
        return res;
    },
    
    getNYSettings: function() {
        var days = this.days || this.defaultDays,
            result = [],
            ny = 0;
        for (var i=0; i<4; i++) {
            result[i] = ny;
            if (days[i].substr(0, 2) > days[(i + 1) % 4].substr(0, 2)) {
                ny = 1;
            }
        }
        return {
            q: result,
            sum: Ext.Array.sum(result)
        };
    },
    
    getPeriodForQuarter: function(quarter, year){
        var ny = this.getNYSettings(),
            days = this.days || this.defaultDays,
            add, result;

        add = ny['sum'] >= 2 ? -1 : 0;
        
        result = {
            startDate: this.getDate((year + add + ny.q[quarter - 1]) + '-' + days[quarter - 1]),
            endDate: this.getDate((year + add + (ny.q[quarter - 1] || ny.q[quarter % 4] || (days[quarter - 1] > days[quarter % 4] ? 1 : 0))) + '-' + days[quarter % 4]),
            quarter: quarter,
            year: year
        };
        result['endDate'] = Ext.Date.add(result['endDate'], Ext.Date.DAY, -1);
        result['shortTitle'] = 'Q' + quarter + ' ' + year;
        result['title'] = 'Q' + quarter + ' ' + year + ' (' + Ext.Date.format(result['startDate'], 'M j') + ' &ndash; ' + Ext.Date.format(result['endDate'], 'M j') + ')';
        
        return result;
    },

    getQuarterForDate: function(date) {
        var result = null,
            days = this.days || this.defaultDays,
            p, next, y;
        date = date || this.getDate();
        p = Ext.Date.format(date, 'm-d');
        
        for (var i=0; i<4; i++) {
            next = (i + 1) % 4;
            y = days[i] <= p && p <= '12-31' ? '0' : '1';
            if (days[i] < days[next]) {
                if (days[i] <= p && p < days[next]) {
                    result = i + 1;
                    break;
                }
            } else {
                if (('0' + days[i]) <= (y + p) && (y + p) < ('1' + days[next])) {
                    result = i + 1;
                    break;
                }
            }

        }
        return result;
    },

    getPeriodForDate: function(date, shift) {
        var quarter = this.getQuarterForDate(date),
            period = this.getPeriodForQuarter(quarter, Ext.Date.format(date, 'Y')*1);
    
        if (period['endDate'] < date) {
            period = this.getPeriodForQuarter(quarter, Ext.Date.format(date, 'Y')*1 + 1);
        } else if (period['startDate'] > date) {
            period = this.getPeriodForQuarter(quarter, Ext.Date.format(date, 'Y')*1 - 1);
        }
        
        if (shift < 0) {
            period = this.getPeriodForDate(Ext.Date.add(period['startDate'], Ext.Date.DAY, -1));
        } else if (shift > 0) {
            period = this.getPeriodForDate(Ext.Date.add(period['endDate'], Ext.Date.DAY, 1));
        }

        return period;
        
    }
    
};

Ext.define('Scalr.ui.CostAnalyticsPeriod', {
	extend: 'Ext.container.Container',
    alias: 'widget.costanalyticsperiod',

    layout: 'hbox',

    mode: null, //week,month,quarter,year
    startDate: null,
    endDate: null,

    initComponent: function() {
        var me = this;

        me.afterChangeBuffered = Ext.Function.createBuffered(me.afterChange, 500);
        me.callParent(arguments);
        if (me.simple) {
            var modeField = me.down('#mode');
            //modeField.items.getAt(0).disable();
            //modeField.items.getAt(1).disable();
            //modeField.items.getAt(3).disable();
            modeField.remove(modeField.items.getAt(4));
        }
    },

    getValue: function() {
        return this.mode ? {
            mode: this.mode,
            startDate: this.startDate,
            endDate: this.endDate
        } : null;
    },

    setValue: function(mode, startDate, endDate) {
        this.mode = mode;
        if (!startDate) {
            this.calculateDateRange();
        } else {
            this.startDate = startDate;
            this.endDate = endDate;
        }
        this.down('#mode').setValue(mode);
    },
    
    calculateDateRange: function(date) {
        var currentDate = Scalr.utils.Quarters.getDate(date);
        switch (this.mode) {
            case 'week':
                this.startDate = Ext.Date.subtract(currentDate, Ext.Date.DAY, currentDate.getDay());
                this.endDate = Ext.Date.add(this.startDate, Ext.Date.DAY, 6);
            break;
            case 'month':
                this.startDate = Ext.Date.getFirstDateOfMonth(currentDate);
                this.endDate = Ext.Date.getLastDateOfMonth(currentDate);
            break;
            case 'quarter':
                var dates = Scalr.utils.Quarters.getPeriodForDate(currentDate);
                this.startDate = dates['startDate'];
                this.endDate = dates['endDate'];
            break;
            case 'year':
                this.startDate = Scalr.utils.Quarters.getDate([currentDate.getFullYear(), 0, 1]);
                this.endDate = Scalr.utils.Quarters.getDate([currentDate.getFullYear(), 11, 31]);
            break;
            case 'custom':
                this.startDate = this.startDate || currentDate;
                this.endDate = this.endDate || currentDate;
            break;
        }
    },
    selectNextPredefined: function(direction) {
        var me = this;
        switch (me.mode) {
            case 'week':
                me.startDate = Ext.Date.add(me.startDate, Ext.Date.DAY, direction*7);
                me.endDate = Ext.Date.add(me.endDate, Ext.Date.DAY, direction*7);
            break;
            case 'month':
                me.startDate = Ext.Date.add(me.startDate, Ext.Date.MONTH, direction);
                me.endDate = Ext.Date.getLastDateOfMonth(me.startDate);
            break;
            case 'quarter':
                var dates = Scalr.utils.Quarters.getPeriodForDate(me.startDate, direction);
                this.startDate = dates['startDate'];
                this.endDate = dates['endDate'];
            break;
            case 'year':
                me.startDate = Ext.Date.add(me.startDate, Ext.Date.YEAR, direction);
                me.endDate = Ext.Date.getLastDateOfMonth(Ext.Date.add(me.startDate, Ext.Date.MONTH, 11));
            break;
        }
        var inputField = me.down('#' + me.getInputIdForMode(me.mode));
        inputField.suspendEvents(false);
        inputField.setValue(inputField.itemId === 'predefinedInput' ? [me.startDate, me.endDate] : me.startDate);
        inputField.resumeEvents();
        me.onChange(true);
    },
    getInputIdForMode: function(mode) {
        switch (mode) {
            case 'week':
                return 'predefinedInput';
            default:
                return mode + 'Input';
        }
    },
    onSelectMode: function(mode) {
        var me = this;
        me.mode = mode;
        me.calculateDateRange();
        if (me.mode === 'custom') {
            var today = Scalr.utils.Quarters.getDate();
            me.down('#predefinedCt').hide();
            me.down('#customStartDate').setValue(me.startDate);
            me.down('#customEndDate').setValue(me.endDate > today ? today : me.endDate);
            me.down('#customCt').show();
        } else {
            var inputField = me.down('#' + me.getInputIdForMode(me.mode));
            inputField.suspendEvents(false);
            inputField.setValue(inputField.itemId === 'predefinedInput' ? [me.startDate, me.endDate] : me.startDate);
            inputField.resumeEvents();
            inputField.up().layout.setActiveItem(inputField);
            //if (!me.simple) {
                me.down('#predefinedCt').show();
            //}
            me.down('#customCt').hide();
            me.onChange();

        }
    },
    onChange: function(buffered) {
        this.down('#predefinedNext').setDisabled(this.endDate >= Scalr.utils.Quarters.getDate());
        this['afterChange' + (buffered ? 'Buffered' : '')]();
        
    },
    afterChange: function() {
        this.fireEvent('change', this.mode, this.startDate, this.endDate, Scalr.utils.Quarters.getPeriodForDate(this.startDate));
    },
    items: [{
        xtype: 'buttongroupfield',
        itemId: 'mode',
        defaults: {
            width: 80
        },
        margin: '0 12 0 0',
        items: [{
            text: 'Weekly',
            value: 'week'
        },{
            text: 'Monthly',
            value: 'month'
        },{
            text: 'Quarterly',
            value: 'quarter'
        },{
            text: 'Yearly',
            value: 'year'
        },{
            text: 'Custom',
            value: 'custom'
        }],
        listeners: {
            change: function(comp, value) {
                this.up('costanalyticsperiod').onSelectMode(value);
            }
        }
    },{
        xtype: 'container',
        itemId: 'predefinedCt',
        layout: 'hbox',
        hidden: true,
        items: [{
            xtype: 'button',
            itemId: 'predefinedPrev',
            cls: 'x-costanalytics-icon-arrow x-costanalytics-icon-arrow-left',
            width: 29,
            margin: '0 6 0 0',
            handler: function() {
                this.up('costanalyticsperiod').selectNextPredefined(-1);
            }
        },{
            xtype: 'container',
            layout: 'card',
            //width: 160,
            items: [{
                xtype: 'textfield',
                itemId: 'predefinedInput',
                readOnly: true,
                width: 160,
                fieldStyle: 'text-align: center;color:#000!important;box-shadow:none',
                valueToRaw: function(value) {
                    if (!value) return value;
                    var rawValue;
                    switch (this.up('costanalyticsperiod').mode) {
                        case 'month':
                            rawValue = Ext.Date.format(value[0], 'F Y');
                        break;
                        /*case 'week':
                            rawValue = Ext.Date.format(value[0], 'M j') + Ext.Date.format(value[1], ' - M j, Y');
                            //rawValue = Ext.Date.format(value, 'Y \\week ' + Ext.Date.getWeekOfYear(value));
                        break;
                        case 'quarter':
                            rawValue = Ext.Date.format(value[0], 'M j') + Ext.Date.format(value[1], ' - M j, Y');
                            //rawValue = Ext.Date.format(value, 'Y \\Q' + (Math.floor(value.getMonth()/3)+1));
                        break;
                        case 'year':
                            rawValue = Ext.Date.format(value[0], 'Y');
                        break;*/
                        default:
                            rawValue = Ext.Date.format(value[0], 'M j') + Ext.Date.format(value[1], ' - M j, Y');
                        break;
                    }
                    return rawValue;
                }
            },{
                xtype: 'monthfield',
                itemId: 'monthInput',
                fieldStyle: 'text-align:center',
                editable: false,
                maxValue: Scalr.utils.Quarters.getDate(),
                listeners: {
                    change: function(field, value){
                        var ct = this.up('costanalyticsperiod');
                        ct.calculateDateRange(value);
                        ct.onChange();
                    }
                }
            },{
                xtype: 'quarterfield',
                itemId: 'quarterInput',
                fieldStyle: 'text-align:center',
                width: 120,
                editable: false,
                maxValue: Scalr.utils.Quarters.getDate(),
                listeners: {
                    change: function(field, value){
                        var ct = this.up('costanalyticsperiod');
                        ct.calculateDateRange(value);
                        ct.onChange();
                    }
                }
            },{
                xtype: 'yearfield',
                itemId: 'yearInput',
                fieldStyle: 'text-align:center',
                width: 120,
                editable: false,
                maxValue: Scalr.utils.Quarters.getDate(),
                listeners: {
                    change: function(field, value){
                        var ct = this.up('costanalyticsperiod');
                        ct.calculateDateRange(value);
                        ct.onChange();
                    }
                }
            }]
        },{
            xtype: 'button',
            itemId: 'predefinedNext',
            cls: 'x-costanalytics-icon-arrow x-costanalytics-icon-arrow-right',
            width: 29,
            margin: '0 0 0 6',
            handler: function() {
                this.up('costanalyticsperiod').selectNextPredefined(1);
            }
        }]
    },{
        xtype: 'container',
        itemId: 'customCt',
        hidden: true,
        layout: {
            type: 'hbox',
            align: 'middle'
        },
        items: [{
            xtype: 'datefield',
            itemId: 'customStartDate',
            vtype: 'daterange',
            daterangeCtId: 'customCt',
            endDateField: 'customEndDate',
            format: 'M j, Y',
            maxValue: Scalr.utils.Quarters.getDate(),
            editable: false,
            width: 120
        },{
            xtype: 'label',
            html: '&ndash;',
            margin: '0 6'
        },{
            xtype: 'datefield',
            itemId: 'customEndDate',
            vtype: 'daterange',
            daterangeCtId: 'customCt',
            startDateField: 'customStartDate',
            format: 'M j, Y',
            editable: false,
            maxValue: Scalr.utils.Quarters.getDate(),
            width: 120
        },{
            xtype: 'button',
            itemId: 'customBtn',
            text: 'Apply',
            margin: '0 0 0 12',
            width: 80,
            handler: function(comp) {
                var c = this.up('costanalyticsperiod');
                c.setValue('custom', comp.prev('#customStartDate').getValue(), comp.prev('#customEndDate').getValue());
                c.onChange();
            }
        }]
    },{
        xtype: 'button',
        itemId: 'refresh',
        ui: 'paging',
        iconCls: 'x-tbar-loading',
        tooltip: 'Refresh',
        cls: 'x-btn-paging-toolbar-small',
        handler: function() {
            this.up('costanalyticsperiod').onChange();
        },
        margin: '5 0 0 12'
    }]
});

Ext.define('Scalr.ui.CostCenterBoxes', {
	extend: 'Ext.container.Container',
    alias: 'widget.costcentersboxes',

    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    loadData: function(mode, quarter, startDate, endDate, data) {
        //total box
        var totals = data['totals'],
            title, today = Scalr.utils.Quarters.getDate(),
            realEndDate = endDate > today ? today : endDate,
            prevStartDate = Ext.Date.parse(data['previousStartDate'], 'Y-m-d'),
            prevEndDate = Ext.Date.parse(data['previousEndDate'], 'Y-m-d'),
            dateFormat = 'M j',
            dateFormatPrev = 'M j';
        this.data = data;

        switch (mode) {
            case 'week':
            case 'custom':
                if (startDate.getFullYear() !== endDate.getFullYear()) {
                    dateFormat = 'M j, Y';
                    dateFormatPrev = 'M j\'y';
                }
                title = startDate < realEndDate ? (Ext.Date.format(startDate, dateFormat) + '&nbsp;&ndash;&nbsp;' + Ext.Date.format(endDate, dateFormat)) : Ext.Date.format(startDate, dateFormat);
            break;
            case 'month':
                title = Ext.Date.format(startDate, 'F Y');
            break;
            case 'year':
                title = Ext.Date.format(startDate, 'Y');
            break;
            case 'quarter':
                title = quarter['title'];
            break;
        }

        this.down('#total').update({
            title: title,
            cost: totals['cost'],
            prevCost: totals['prevCost'],
            forecastCost: totals['forecastCost'],
            growth: totals['growth'],
            growthPct: totals['growthPct'],
            period: mode === 'custom' ? 'period' : mode,
            prevPeriod: (prevStartDate - prevEndDate === 0) ? Ext.Date.format(prevStartDate, dateFormatPrev) : (Ext.Date.format(prevStartDate, dateFormatPrev) + '&nbsp;&ndash;&nbsp;' + Ext.Date.format(prevEndDate, dateFormatPrev))
        });

        //trends
        this.down('#trends').update({
            rollingAverageMessage: totals['trends']['rollingAverageMessage'],
            rollingAverage: totals['trends']['rollingAverage'],
            periodHighDate: '<span style="white-space:nowrap">'+ totals['trends']['periodHighDate']+'</span>',
            periodHigh: totals['trends']['periodHigh'],
            periodLowDate: '<span style="white-space:nowrap">'+ totals['trends']['periodLowDate']+'</span>',
            periodLow: totals['trends']['periodLow'],
            interval: data['interval'],
            topspender: this.getTopSpender(),
            subject: this.subject
        });

        //budget
        var budgetCt = this.down('#budget'),
            noBudgetCt = this.down('#noBudget');
        if (totals['budget']['budget'] != 0) {
            budgetCt.show();
            noBudgetCt.hide();
            budgetCt.down('#title').update({
                year: totals['budget']['year'],
                quarter: totals['budget']['quarter'],
                total: totals['budget']['budget'],
                ccId: data['ccId'],
                projectId: data['projectId']
            });
            budgetCt.down('#budgetSpentPct').update({
                value: totals['budget']['budgetSpentPct'],
                currentPeriodSpend: mode === 'month' ? '(' + totals['budget']['budgetSpentThisPeriodPct'] + '% used in ' + Ext.Date.format(startDate, 'F Y') + ')' : ''
            });
            budgetCt.down('chart').store.loadData([[totals['budget']['budgetSpentPct']]]);
            budgetCt.down('#budgetRemain').update(totals['budget']);
            this.down('#budgetAlert').setVisible(!!totals['budget']['budgetAlert']).update({
                ccId: data['ccId'],
                projectId: data['projectId'],
                alert: totals['budget']['budgetAlert']
            });
        } else {
            noBudgetCt.down('#title').update({
                year: totals['budget']['year'],
                quarter: totals['budget']['quarter'],
                text: totals['budget']['closed'] ? 'Budget hasn\'t been set' : 'No budget allocated',
                ccId: data['ccId'],
                projectId: data['projectId']
            });
            noBudgetCt.down('#finalSpent').setVisible(!!totals['budget']['closed']).update({budgetFinalSpent: totals['budget']['budgetFinalSpent']});
            noBudgetCt.down('#button').setVisible(!totals['budget']['closed']);
            budgetCt.hide();
            noBudgetCt.show();
        }
    },
    getTopSpender: function(){
        var top = this.data['totals']['top'][this.subject === 'costcenters' ? 'projects' : 'farms'],
            topspender = null;
        if (top.length) {
            topspender = top[0];
            if ((!top[0].id || top[0].id === 'everything else') && top.length > 1) {
                topspender = top[1];
            }
            if (topspender.cost == 0) {
                topspender = null;
            }
        }
        return topspender;
    },
    defaults: {
        minHeight: 250
    },
    items: [{
        xtype: 'component',
        cls: 'x-cabox',
        itemId: 'total',
        flex: 1,
        minWidth: 160,
        maxWidth: 500,
        tpl: '<div class="x-cabox-title">{title}</div>'+
             '<div style="margin:16px 0 0">Spent' +
                '<div style="margin: 8px 0 0">' +
                    '<span class="title1" style="position:relative;top:-4px">{[this.currency(values.cost)]}</span>' +
                    '<tpl if="growth!=0">' +
                        ' &nbsp;{[this.pctLabel(values.growth, values.growthPct)]}' +
                    '</tpl>'+
                '</div>' +
             '</div>'+
             '<div style="margin:16px 0 0;padding:0 0 6px 0;min-height:51px">'+
                '<div style="margin:0 0 6px">Prev. {period} ({prevPeriod})</div>' +//Same time previous {period}
                '<span class="title2">{[this.currency(values.prevCost)]}</span>&nbsp; ' +
             '</div>'+
             '<tpl if="forecastCost!==null">' +
                '<div style="margin:6px 0 6px">{period:capitalize} end estimate</div>' +
                '<span class="title2" style="padding-right:1em">~ {[this.currency(values.forecastCost)]}</span>' +
             '</tpl>'
    },{
        xtype: 'component',
        cls: 'x-cabox',
        itemId: 'trends',
        flex: 1,
        minWidth: 160,
        maxWidth: 500,
        tpl: '<div class="x-cabox-title">Trends</div>' +
             '<div style="margin:16px 0 0">{rollingAverageMessage}<div style="margin: 4px 0 8px"><span class="title1">{[this.currency(values.rollingAverage)]}</span> per {interval}</div></div>'+
             '<div style="margin:20px 0 14px">Top spender' +
                '<div style="margin: 4px 0 8px">' +
                    '<tpl if="topspender">' +
                        '<span style="position:relative;top:2px;font-weight:bold">'+
                            '<tpl if="subject==\'costcenters\'">' +
                                '<a href="#/analytics/projects?projectId={[values.topspender.id]}">{[values.topspender.name]}</a>' +
                            '<tpl else>' +
                                '<a href="#farms" data-qtip="{[this.farmInfo(values.topspender, true)]}">{[values.topspender.name]}</a>' +
                            '</tpl>' +
                        '</span>' +
                        '<tpl if="topspender.growth!=0">' +
                            ' &nbsp;{[this.pctLabel(values.topspender.growth, values.topspender.growthPct)]}' +
                        '</tpl>'+
                    '<tpl else>' +
                        '&ndash;' +
                    '</tpl>' +
                '</div>' +
             '</div>'+
             '<table>' +
             '<tr><td style="width:50%;vertical-align:top">' +
                     '<div style="margin:0 0 6px 0;padding:6px 0 0;">Period high ({periodHighDate})</div>' +
                     '<div class="title2">{[this.currency(values.periodHigh)]}</div>' +
             '</td><td style="vertical-align:top">' +
                     '<div style="margin:6px 0 6px 0;">Period low ({periodLowDate})</div>' +
                     '<div class="title2">{[this.currency(values.periodLow)]}</div>' +
             '</td></tr>' +
             '</table>',
        listeners: {
            afterrender: function() {
                var me = this;
                me.getEl().on('click', function(e) {
                    var el = me.el.query('a');
                    if (el.length) {
                        for (var i=0, len=el.length; i<len; i++) {
                            if (e.within(el[i]) && el[i].getAttribute('href') == '#farms') {
                                me.up('costcentersboxes').fireEvent('farmclick');
                                e.preventDefault();
                                break;
                            }
                        }
                    }
                });
            }
        }
    },{
        xtype: 'container',
        cls: 'x-cabox',
        itemId: 'budget',
        layout: {
            type: 'vbox',
            align: 'stretch'
        },
        flex: 1.2,
        items: [{
            xtype: 'component',
            itemId: 'title',
            tpl: '<div class="x-cabox-title"><a style="color:#212b3d;float:left" href="#/analytics/budgets?ccId={ccId}<tpl if="projectId">&projectId={projectId}</tpl>">{[Ext.isNumeric(values.quarter)?\'Q\':\'\']}{quarter} {year} budget</a><span style="float:right;line-height:38px" class="title2">{[this.currency(values.total)]}</span></div>'
        },{
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'hbox',
                align: 'stretch'
            },
            items: [{
                xtype: 'container',
                flex: 1,
                items: [{
                    xtype: 'chart',
                    width: 140,
                    height: 110,
                    animate: true,
                    store: Ext.create('Ext.data.ArrayStore', {
                        fields: ['value']
                    }),
                    insetPadding: 0,
                    axes: [{
                        type: 'gauge',
                        position: 'gauge',
                        minimum: 0,
                        maximum: 100,
                        steps: 1,
                        margin: 7
                    }],
                    series: [{
                        type: 'gauge',
                        field: 'value',
                        donut: 70,
                        renderer: function(sprite, record, attr, index, store){
                            if (index === 0) {
                                var value = record.get('value'),
                                    color;
                                if (value >= 95) {
                                    color = '#de1810';
                                } else if(value >= 75) {
                                    color = '#ffae39';
                                } else {
                                    color = '#319608';
                                }
                            } else {
                                color = '#f0f1f4';
                            }
                            return Ext.apply(attr, {fill: color});
                        }
                    }]
                },{
                    xtype: 'component',
                    itemId: 'budgetSpentPct',
                    tpl: '<div class="title1" style="font-size:17px">{value}% <span>used</span></div><p>{currentPeriodSpend}</p>',
                    margin: '-16 0 0 0'
                }]
            },{
                xtype: 'component',
                flex: 1,
                itemId: 'budgetRemain',
                tpl: new Ext.XTemplate(
                     '<tpl if="closed">' +
                        '<div style="margin: 16px 0 0">Final spend<div class="title1 x-costanalytics-{[this.getColorCls(values)]}" style="margin: 4px 0 8px">{[this.currency(values.budgetFinalSpent)]}</div></div>' +
                        '<div style="padding:10px 0 0">Cost variance<div class="title2 x-costanalytics-{[values.costVariance>0?\'red\':\'green\']}" data-qtip="{costVariancePct}%">{[values.costVariance>0?\'+\':\'\']}{costVariance:currency}</div></div>'+
                        '<div style="padding:12px 0 0">Exceeded on<tpl if="estimateDate"><div class="title2 x-costanalytics-red" style="margin: 4px 0 8px">{estimateDate:date(\'M j Y\')}</div><tpl else><div class="title2">&ndash;</div></tpl></div>'+
                     '<tpl else>'+
                        '<div style="margin: 16px 0 0">Remaining<div class="title1 x-costanalytics-{[this.getColorCls(values)]}" style="margin: 4px 0 8px">{[this.currency(values.budgetRemain)]}</div></div>' +
                        '<div style="padding:10px 0 0">Overspend estimate<div class="title2<tpl if="estimateOverspend&gt;0"> x-costanalytics-red</tpl>" <tpl if="estimateOverspendPct&gt;0">data-qtip="{estimateOverspendPct}% of budget"</tpl> style="margin: 4px 0 0">~{[this.currency(values.estimateOverspend)]}</div></div>'+
                        '<div style="padding:12px 0 0">Exceed{[values.budgetRemain>0?\'\':\'ed\']} on<tpl if="estimateDate"><div class="title2 x-costanalytics-red" style="margin: 4px 0 8px">{estimateDate:date(\'M j Y\')}</div><tpl else><div class="title2">&ndash;</div></tpl></div>'+
                     '</tpl>',
                     {
                        getColorCls: function(values) {
                            var cls = 'green';
                            if (values.budget) {
                                if (values.budgetRemainPct < 5) {
                                    cls = 'red';
                                } else if (values.budgetRemainPct < 25) {
                                    cls = 'orange';
                                }
                            }
                            return cls;
                        }
                     }
                )
            }]
        },{
            xtype: 'component',
            itemId: 'budgetAlert',
            margin: '6 0 0',
            hidden: true,
            tpl: '<img src="' + Ext.BLANK_IMAGE_URL + '" class="x-icon-warning"/>&nbsp;&nbsp;<a class="x-link-warning" href="#/analytics/budgets?ccId={ccId}<tpl if="projectId">&projectId={projectId}</tpl>">{alert}</a>'
        }]
    },{
        xtype: 'container',
        cls: 'x-cabox',
        itemId: 'noBudget',
        hidden: true,
        layout: 'auto',
        flex: 1.2,
        items: [{
            xtype: 'component',
            itemId: 'title',
            tpl: '<div class="x-cabox-title"><a style="color:#212b3d;float:left" href="#/analytics/budgets?ccId={ccId}<tpl if="projectId">&projectId={projectId}</tpl>">{[Ext.isNumeric(values.quarter)?\'Q\':\'\']}{quarter} {year} Budget</a><span style="float:right;font-weight:normal"><i>{text}</i></span></div>'
        },{
            xtype: 'component',
            itemId: 'finalSpent',
            margin: '56 0 0 0',
            tpl: 'Final spend<div class="title1" style="margin: 4px 0 8px">{[this.currency(values.budgetFinalSpent)]}</div>'
        },{
            xtype: 'button',
            itemId: 'button',
            margin: '56 0 0 0',
            padding: '0 24',
            cls: 'x-btn-green-bg',
            height: 52,
            text: 'Define a budget',
            handler: function(){
                var data = this.up('costcentersboxes').data;
                Scalr.event.fireEvent('redirect', '#/analytics/budgets?ccId=' + data['ccId'] + (data['projectId'] ? '&projectId=' + data['projectId'] : ''));
            }
        }]
    }]
});


Ext.define('Scalr.ui.CostAnalyticsViewSelector', {
	extend: 'Scalr.ui.FormFieldButtonGroup',
    alias: 'widget.costanalyticsviewselector',

    defaults: {
        width: 45
    },
    margin: '0 10 0 0',
    items: [{
        cls: 'x-costanalytics-icon-line-chart',
        value: 'line'
    },{
        cls: 'x-costanalytics-icon-bars-chart',
        value: 'stacked'
    },{
        cls: 'x-costanalytics-icon-pie-chart',
        value: 'pie'
    },{
        cls: 'x-costanalytics-icon-grid',
        value: 'grid'
    }]

});

Ext.define('Scalr.ui.CostAnalyticsSeriesSelector', {
	extend: 'Ext.container.Container',
    alias: 'widget.costanalyticsseriesselector',

    layout: 'hbox',
    margin: '0 0 0 36',
    
    defaults: {
        margin: '0 6 0 0'
    },
    
    setSeries: function(type, series){
        var me = this,
            seriesCount = Ext.Object.getSize(series);
        me.suspendLayouts();
        me.removeAll();
        if (type !== 'clouds' && seriesCount > 3 || type === 'farms') {
            var menuItems = [];
            Ext.Object.each(series, function(key, value){
                menuItems.push({
                    text: '<span style="color:#'+value.color+'">'  + value.name + '</span>',
                    value: key,
                    checked: value.enabled
                });
            });
            me.add({
                xtype: 'cyclealt',
                multiselect: true,
                cls: 'x-btn-compressed',
                width: 200,
                allSelectedText: 'All ' + type + ' selected',
                selectedItemsSeparator: ', ',
                selectedTpl: '{0} of {1} ' + type + ' selected',
                noneSelectedText: 'No ' + type + ' selected',
                changeHandler: function(comp, item) {
                    me.fireEvent('change', me, item.value, !!item.checked);
                },
                getItemText: function(item) {
                    return item.text;
                },
                menu: {
                    cls: 'x-menu-light',
                    minWidth: 200,
                    items: menuItems
                }
            });
        } else {
            Ext.Object.each(series, function(key, value){
                me.add({
                    xtype: 'button',
                    cls: 'x-costanalytics-item-btn x-costanalytics-' + value.color,
                    text: (type === 'clouds' ? '<img src="'+Ext.BLANK_IMAGE_URL+'" class="x-icon-platform-small x-icon-platform-small-'+key+'" />' : value.name),
                    tooltip: !value.enabled ? 'No spends on the <b>' + value.name + '</b>' : value.name,
                    value: key,
                    pressed: value.enabled,
                    disabled: !value.enabled,
                    enableToggle: true,
                    maxWidth: 130,
                    toggleHandler: function(btn, pressed){
                        me.fireEvent('change', me, btn.value, pressed);
                    }
                });
            });
        }
        me.resumeLayouts(true);
    },

    toggleSeries: function(series) {
        if (this.items.first().xtype === 'cyclealt') {
            this.down().menu.items.each(function(item){
                if (series[item.value] !== undefined) {
                    item.setChecked(series[item.value], true);
                }
            });
        } else {
            this.items.each(function(item){
                if (series[item.value] !== undefined) {
                    item.toggle(series[item.value], true);
                }
            });
        }
    }
});

Ext.define('Scalr.ui.CostAnalyticsSpends', {
	extend: 'Ext.container.Container',
    alias: 'widget.costanalyticsspends',

    type: null,//clouds|projects|farms
    colorMap: null,
    
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [{
        xtype: 'container',
        layout: {
            type: 'hbox',
            align: 'middle'
        },
        margin: '0 0 24 0',
        items: [{
            xtype: 'component',
            itemId: 'title',
            cls: 'x-caheader',
            tpl: '{title}'
        },{
            xtype: 'label',
            cls: 'x-label-grey',
            itemId: 'pieChartInfo',
            flex: 1,
            hidden: true,
            style: 'text-align: center',
            text: 'Click on the grid item to see spend details.'// graph or
        },{
            xtype: 'tbfill',
            flex: 0.01
        },{
            xtype: 'costanalyticsviewselector',
            itemId: 'viewSelector',
            listeners: {
                change: function(comp, value) {
                    if(value) {
                        this.up('costanalyticsspends').onViewSelect(value);
                    }
                }
            }
        }]
    },{
        xtype: 'container',
        itemId: 'viewWrapper',
        layout: 'card',
        flex: 1
    }],

    initComponent: function() {
        this.enabledSeries = {clouds:{}, projects:{}, farms:{}};
        this.callParent(arguments);
    },

    setType: function(type) {
        if (this.type !== type) {
            this.type = type;
            if (this.type) {
                var viewSelector = this.down('#viewSelector'),
                    view = viewSelector.getValue() || 'line';
                viewSelector.setValue(null);
                viewSelector.setValue(view);
            }
        }
    },

    loadDataDeferred: function() {
        if (this.rendered) {
            this.loadData.apply(this, arguments);
        } else {
            if (this.loadDataBind !== undefined) {
                this.un('afterrender', this.loadDataBind, this);
            }
            this.loadDataBind = Ext.bind(this.loadData, this, arguments);
            this.on('afterrender', this.loadDataBind, this, {single: true});
        }
    },

    setColorMap: function() {
        var me = this,
            totals = me.data['totals'];
        me.colorMap = {};
        Ext.each(['clouds', 'projects', 'farms'], function(type){
            if (totals[type]) {
                me.colorMap[type] = {};
                Ext.each(totals[type], function(item, index){
                    me.colorMap[type][item.id] = Scalr.utils.getColorById.apply(me, type === 'clouds' ? [item['id'], 'clouds'] : [index, 'farms']);
                });
            }
        });
    },
    loadData: function(mode, quarter, startDate, endDate, data) {
        var viewSelector = this.down('#viewSelector'),
            view = viewSelector.getValue() || 'line',
            today = Scalr.utils.Quarters.getDate(),
            realEndDate = endDate > today ? today : endDate,
            title;

        switch (mode) {
            case 'week':
            case 'custom':
                title = startDate < realEndDate ? (Ext.Date.format(startDate, 'M j') + '&nbsp;&ndash;&nbsp;' + Ext.Date.format(endDate, 'M j')) : Ext.Date.format(startDate, 'F j');
            break;
            case 'month':
                title = Ext.Date.format(startDate, 'F Y');
            break;
            case 'year':
                title = Ext.Date.format(startDate, 'Y');
            break;
            case 'quarter':
                title = quarter['title'];
            break;
        }

        this.mode = mode;
        this.interval = data['interval'];
        this.startDate = startDate;
        this.endDate = endDate;
        this.realEndDate = endDate > today ? today : endDate;
        this.data = data;
        this.setColorMap();
        
        this.down('#title').update({title: title});
        var eventsGrid = this.down('#eventsGrid');
        if (eventsGrid) eventsGrid.hide();

        if (this.type) {
            viewSelector.setValue(null);
            viewSelector.setValue(view);
        }
    },

    getColoredItemTitle: function(type, id, name, icon) {
        return '<span style="color:#' + this.getItemColor(id, type)+ '">' + (type === 'clouds' ? (icon ? '<img src="'+Ext.BLANK_IMAGE_URL+'" class="x-icon-platform-small x-icon-platform-small-'+id+'"/>&nbsp;&nbsp;' : '') + Scalr.utils.getPlatformName(id) : name) + '</span>';
    },

    getItemColor: function(id, type) {
        var colorMap = this.colorMap[type];
        if (colorMap && colorMap[id] !== undefined) {
            return colorMap[id];
        } else {
            return '000000';
        }
    },

    getItemTitle: function(type, id, name, icon) {
        return (type === 'clouds' ? (icon ? '<img src="'+Ext.BLANK_IMAGE_URL+'" class="x-icon-platform-small x-icon-platform-small-'+id+'"/>&nbsp;&nbsp;' : '') + Scalr.utils.getPlatformName(id) : name);
    },
    
    getPeriodTitle: function(capitalize) {
        var title = this.mode === 'custom' ? 'period' : this.mode;
        return capitalize ? Ext.String.capitalize(title) : title;
    },

    prepareDataForChartStore: function() {
        var me = this,
            res = [];
        Ext.Array.each(me.data['timeline'], function(item, index){
            //datetime, onchart, label, extrainfo, events, series1data, series2data....
            var row = [item.datetime, item.onchart, item.label, {}, item.events];
            Ext.Object.each(me.data[me.type], function(key, value){
                row[3][key] = value['data'][index];
                row.push(value['data'][index] ? value['data'][index]['cost'] : undefined);
            });
            res.push(row);
        });
        return res;
    },

    getEnabledSeries: function() {
        var me = this,
            res = [],
            series = Ext.Object.getKeys(me.data[me.type]);
        Ext.Array.each(series, function(s){
            var enabled = me.enabledSeries[me.type][s];
            if (enabled === undefined && me.isSeriesEnableByDefault(s) || enabled === true) {
                res.push(s);
            }
        });
        return res;
    },

    isSeriesEnableByDefault: function(id) {
        var res = false;
        if (id !== 'everything else') {
            Ext.each(this.data['totals']['top'][this.type], function(data){
                if (data['id'] == id) {
                    res = data['cost'] > 0;
                    return false;
                }
            });
        }
        return res;
    },

    setEnabledSeries: function(type, series) {
        var me = this;
        Ext.Object.each(me.data[me.type], function(key){
            me.enabledSeries[type][key] = false;
        });
        Ext.each(series, function(key){
            me.enabledSeries[type][key] = true;
        });
    },

    onViewSelect: function(view) {
        var me = this,
            viewName = (view === 'line' || view === 'stacked') ? 'chart' : view;
        me.down('#pieChartInfo').setVisible(view === 'pie');
        me['select' + Ext.String.capitalize(viewName) + 'View'](view);
    },

    selectChartView: function(view) {
        var me = this,
            enabledSeries = me.getEnabledSeries(),
            viewWrapper = me.down('#viewWrapper'),
            chartWrapper = viewWrapper.getComponent('chartWrapper'),
            chart,
            data = me.data[me.type],
            seriesList = Ext.Object.getKeys(data),
            series = [],
            chartTipTpl = '{[this.itemCost(values)]}';
        viewWrapper.suspendLayouts();
        if (!chartWrapper) {
            chartWrapper = viewWrapper.add({
                xtype: 'container',
                itemId: 'chartWrapper',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                }
            });
        } else {
            chartWrapper.down('#totals').show();
            var details = chartWrapper.down('#details');
            if (details) details.hide();
        }
        if (view === 'line') {
            Ext.Array.each(seriesList, function(value){
                var color = me.getItemColor(value, me.type);
                series.push({
                    type: 'line',
                    selectionTolerance: 8,
                    skipWithinBoxCheck: true,
                    shadowAttributes: [],
                    axis: 'left',
                    xField: 'xLabel',
                    yField: value,
                    seriesIsHidden: !Ext.Array.contains(enabledSeries, value),
                    //showMarkers: false,
                    style: {
                        stroke: color,
                        opacity: 0.7,
                        'stroke-width': 1
                    },
                    highlight: {
                        //radius: 5,
                        fill: color,
                        'stroke-width': 0
                    },
                    highlightLine: false,
                    //smooth: true,
                    markerConfig: {
                        type: 'circle',
                        radius: 3,
                        fill: color,
                        'stroke-width': 0,
                        cursor: 'pointer'
                    },
                    listeners: {
                        itemclick: function(item) {
                            me.onShowChartViewDetails(item.series.yField, data[item.series.yField]['name'], item.storeItem.get('label'), item.storeItem.get('datetime'), item.storeItem.get('extrainfo')[item.series.yField]);
                        }
                    },
                    tips: {
                        trackMouse: true,
                        //anchor: 'top',
                        hideDelay: 0,
                        showDelay: 0,
                        tpl: chartTipTpl,
                        renderer: function(record, item) {
                            var info = record.get('extrainfo')[item.series.yField];
                            this.update({
                                id: item.series.yField,
                                type: me.type,
                                name: me.type === 'clouds' ? Scalr.utils.getPlatformName(item.series.yField) : data[item.series.yField]['name'],
                                label: record.get('label'),
                                cost: info['cost'],
                                costPct: info['costPct'],
                                interval: me.data['interval']
                            });
                        }
                    }
                });
            });
        } else if (view === 'stacked') {
            series.push({
                type: 'column',
                shadowAttributes: [],
                axis: 'bottom',
                gutter: 80,
                xField: 'xLabel',
                yField: enabledSeries,
                stacked: true,
                xPadding: 0,
                listeners: {
                    itemclick: function(item) {
                        me.onShowChartViewDetails(item.yField, data[item.yField]['name'], item.storeItem.get('label'), item.storeItem.get('datetime'), item.storeItem.get('extrainfo')[item.yField]);
                    }
                },
                style: {
                    cursor: 'pointer'
                },
                renderer: function(sprite, record, attr, index, store){
                    var yField = sprite.surface.owner.series.getAt(0).yField,
                        name = yField[index%yField.length];
                    Ext.apply(attr, {fill: me.getItemColor(name, me.type)});
                    return attr;
                },
                tips: {
                    trackMouse: true,
                    hideDelay: 0,
                    showDelay: 0,
                    tpl: chartTipTpl,
                    renderer: function(record, item) {
                        var info = record.get('extrainfo')[item.yField] || {};
                        this.update({
                            id: item.yField,
                            type: me.type,
                            name: me.type === 'clouds' ? Scalr.utils.getPlatformName(item.yField) : data[item.yField]['name'],
                            label: record.get('label'),
                            cost: info['cost'],
                            costPct: info['costPct'],
                            interval: me.data['interval']
                        });
                    }
                }
            });
        }
        series.push({
            type: 'events',
            xField: 'xLabel',
            yField: 'events',
            shadowAttributes: [],
            skipWithinBoxCheck: true,
            yOffset: -12,
            highlight: {
                opacity: .6
            },
            markerConfig: {
                type: 'image',
                src: '/ui2/images/ui/analytics/event.png',
                width: 14,
                height: 12,
                cursor: 'pointer',
                //zIndex: 4001
            },
            listeners: {
                itemclick: function(item) {
                    me.onShowEvents(item.storeItem.get('label'), item.storeItem.get('datetime'));
                }
            },
            tips: {
                trackMouse: true,
                //anchor: 'top',
                hideDelay: 0,
                showDelay: 0,
                tpl: '<b>{label}</b><br/>{eventsCount} event(s)',
                renderer: function(record, item) {
                    this.update({
                        label: record.get('label'),
                        eventsCount: record.get('events')
                    });
                }
            }
        });
        chartWrapper.remove(chartWrapper.getComponent('chart'));
        chart = chartWrapper.insert(0, {
            xtype: 'chart',
            itemId: 'chart',
            height: 200,
            theme: 'Scalr',
            animate: true,
            insetPaddingTop: 18,
            allSeries: seriesList,
            store: Ext.create('Ext.data.ArrayStore', {
                fields: Ext.Array.merge([{
                   name: 'datetime',
                   type: 'date',
                   convert: function(v, record) {
                       return Scalr.utils.Quarters.getDate(v, true);
                   }
                }, 'xLabel', 'label', 'extrainfo', 'events'], seriesList),
                data: me.prepareDataForChartStore()
            }),
            toggleSeries: function(value) {
                if (view === 'stacked') {
                    chart.series.getAt(0).yField = Ext.Array.intersect(this.allSeries, value);
                } else {
                    chart.series.each(function(){
                        if (this.type !== 'events') {
                            this.seriesIsHidden = !Ext.Array.contains(value, this.yField);
                        }
                    });
                }
                chart.refresh();
            },
            axes: [{
                type: 'Numeric',
                position: 'left',
                fields: seriesList,
                label: {
                    renderer: function(value){return value > 0 ? Ext.util.Format.currency(value, null, value >= 5 ? 0 : 2) : 0}
                },
                style : {
                    stroke : 'red'
                },
                grid: {
                    even: {
                        fill: '#f3f6f8',
                        stroke: '#eaf0f4',
                        height: 1
                    },
                    odd: {
                        fill: '#f3f6f8',
                        stroke: '#eaf0f4',
                        height: 1
                    }
                },
                minimum: 0,
                majorTickSteps: 3
            },{
                type: 'Category',
                position: 'bottom',
                dateFormat: 'M d',
                fields: ['xLabel']
            }],
            series: series
        });
        this.showChartViewTotals();
        viewWrapper.layout.setActiveItem(chartWrapper);
        viewWrapper.resumeLayouts(true);
    },

    showChartViewTotals: function() {
        var me = this,
            chartWrapper = me.down('#chartWrapper'),
            totals = chartWrapper.down('#totals'),
            details = chartWrapper.down('#details'),
            averageColHeader = Ext.String.capitalize(me.data['interval'].replace('day', 'dai')) + 'ly average',
            forecastColHeader = Ext.String.capitalize(me.mode === 'custom' ? 'period' : me.mode) + ' end estimate',
            itemTitle = me.type === 'clouds' ? 'Cloud' : (me.type === 'projects' ? 'Project' : 'Farm');
        if (!totals) {
            totals = chartWrapper.add({
                xtype: 'grid',
                itemId: 'totals',
                flex: 1,
                margin: '12 0 0 0',
                cls: 'x-grid-shadow x-grid-no-highlighting',
                features: [{
                    ftype: 'summary',
                    id: 'summary',
                    dock: 'bottom'
                }],
                selModel: {
                    selType: 'selectedmodel',
                    injectCheckbox: 'first',
                    listeners: {
                        selectionchange: function(selModel, selected){
                            var enabledSeries = Ext.Array.map(selected, function(rec){return rec.get('id')});
                            me.down('#chart').toggleSeries(enabledSeries);
                            me.setEnabledSeries(me.type, enabledSeries);
                        }
                    }
                },
                setSelected: function(selected) {
                    this.getSelectionModel().select(selected);
                },
                setSelectedDeferred: function(selected) {
                    if (this.rendered) {
                        this.setSelected(selected);
                    } else {
                        this.on('afterrender', Ext.bind(this.setSelected, this, arguments), this, {single: true});
                    }
                },
                store: {
                    proxy: 'object',
                    fields: [{name: 'id', type: 'string'}, 'name', 'cost', 'costPct', 'prevCost', 'prevCostPct', 'growth', 'growthPct', 'averageCost', 'forecastCost', 'environment'],
                    sorters: {
                        property: 'cost',
                        direction: 'DESC'
                    },
                    data: me.data['totals'][me.type]
                },
                viewConfig: {
                    deferEmptyText: false,
                    emptyText: 'No data for selected period'
                },
                columns: [{
                    header: itemTitle,
                    dataIndex: 'name',
                    sortable: true,
                    flex: 1,
                    maxWidth: 200,
                    xtype: 'templatecolumn',
                    tpl: new Ext.XTemplate(
                            '<tpl if="this.getType()==\'clouds\'">',
                                '<img src="'+Ext.BLANK_IMAGE_URL+'" class="x-icon-platform-small x-icon-platform-small-{id}"/> {[this.getColoredName(values.id, values.name)]}',
                            '<tpl elseif="this.getType()==\'projects\'&&id">',
                                '<a href="#/analytics/projects?projectId={id}">{[this.getColoredName(values.id, values.name)]}</a>',
                            '<tpl else>',
                                '<span data-qtip="{[this.farmInfo(values, true)]}">{[this.getColoredName(values.id, values.name)]}</span>',
                            '</tpl>',
                    {
                        getType: function(){
                            return me.type;
                        },
                        getColoredName: function(id, name){
                            return me.getColoredItemTitle(me.type, id, name);
                        }
                    }),
                    summaryRenderer: function() {
                        return 'Total spend:';
                    }
                },{
                    header: 'Total',
                    dataIndex: 'cost',
                    xtype: 'templatecolumn',
                    flex: 1.6,
                    tpl: '{[this.currency(values.cost)]} {[values.costPct > 0 ? \'(\'+values.costPct+\'%)\' : \'\']}',
                    summaryRenderer: function() {
                        return Ext.util.Format.currency(Math.round(me.data['totals']['cost']), null, 0)
                    }
                },{
                    header: 'Previous ' + me.getPeriodTitle(),
                    dataIndex: 'prevCost',
                    xtype: 'templatecolumn',
                    flex: 1.2,
                    tpl: '{[this.currency(values.prevCost)]}',
                    summaryRenderer: function() {
                        return Ext.util.Format.currency(Math.round(me.data['totals']['prevCost']), null, 0)
                    }
                },{
                    header: 'Growth',
                    dataIndex: 'growth',
                    xtype: 'templatecolumn',
                    width: 90,
                    tpl:
                        '<tpl if="growth!=0">' +
                            '{[this.pctLabel(values.growth, values.growthPct, \'small\', \'invert\')]}' +
                        '</tpl>'

                },{
                    header: averageColHeader,
                    dataIndex: 'averageCost',
                    xtype: 'templatecolumn',
                    flex: 1.1,
                    tpl: '<tpl if="averageCost&gt;=.5">{[this.currency(values.averageCost)]}</tpl>'
                },{
                    header: forecastColHeader,
                    dataIndex: 'forecastCost',
                    xtype: 'templatecolumn',
                    flex: 1,
                    tpl: '<tpl if="forecastCost&gt;0">~ {[this.currency(values.forecastCost)]}</tpl>',
                    summaryRenderer: function() {
                        return me.data['totals']['forecastCost']>0 ? '~ '+Ext.util.Format.currency(Math.round(me.data['totals']['forecastCost']), null, 0) : '';
                    }
                }]
            });
        } else {
            totals.columns[0].setText(itemTitle);
            //totals.columns[1].setText(me.getPeriodTitle(true) + ' total');
            totals.columns[2].setText('Previous ' + me.getPeriodTitle());
            totals.columns[4].setText(averageColHeader);
            totals.columns[5].setText(forecastColHeader);
            totals.getSelectionModel().deselectAll(true);
            totals.store.loadData(me.data['totals'][me.type]);
        }
        totals.setSelectedDeferred(Ext.Array.map(me.getEnabledSeries(), function(id){
            return totals.store.getById(id);
        }));
        totals.show();
        if (details) details.hide();
    },

    onShowEvents: function(label, datetime) {
        var me = this;
        Scalr.Request({
            processBox: {
                type: 'action',
                msg: 'Loading events...'
            },
            url: '/analytics/dashboard/xGetTimelineEvents',
            params: {
                ccId: me.data['ccId'],
                projectId: me.data['projectId'],
                date: Ext.Date.format(datetime, 'Y-m-d H:i'),
                mode: me.mode,
                start: Ext.Date.format(me.startDate, 'Y-m-d'),
                end: Ext.Date.format(me.endDate, 'Y-m-d')
            },
            success: function (res) {
                me.showEvents(label, datetime, res['data']);
            }
        });
    },

    showEvents: function(label, datetime, events) {
        var me = this,
            chartWrapper = me.down('#chartWrapper'),
            eventsGrid = chartWrapper.down('#eventsGrid');

        if (!eventsGrid) {
            eventsGrid = chartWrapper.insert(1, {
                xtype: 'grid',
                itemId: 'eventsGrid',
                cls: 'x-grid-shadow x-grid-no-highlighting',
                margin: '12 0 18',
                store: {
                    fields: [{
                        name: 'dtime',
                        type: 'date',
                        convert: function(v, record) {
                            return Scalr.utils.Quarters.getDate(v, true);
                        }
                    }, 'description', 'type'],
                    sorters: {property: 'dtime'},
                    proxy: 'object'
                },
                maxHeight: 224,
                viewConfig: {
                    emptyText: 'No events found',
                    deferEmptyText: false
                },
                columns: [{
                    xtype: 'templatecolumn',
                    header: 'Events',
                    //dataIndex: 'dtime',
                    sortable: false,
                    resizable: false,
                    flex: 1,
                    tpl: new Ext.XTemplate(
                        '{[this.getEventIcon(values)]}&nbsp;&nbsp;<span style="margin-right:40px">{dtime:date(\'M j, Y h:i a\')}</span>{description}',
                        {
                            getEventIcon: function(values) {
                                var title = '', color = '';
                                switch (values['type']) {
                                    case 1:
                                    case 2:
                                        title = 'Project assignement change';
                                        color = '#FD8D11';
                                    break;
                                    case 3:
                                    case 4:
                                        title = 'Cost center assignement change';
                                        color = '#65A615';
                                    break;
                                    case 5:
                                        title = 'Pricing change';
                                        color = '#DD0202';
                                    break;
                                }
                                return '<img src="' + Ext.BLANK_IMAGE_URL + '" title="'+title+'" style="background:'+color+';border-radius:2px;width: 12px;height:12px;"/>';
                            }
                        }
                    )
                }],
                dockedItems: [{
                    xtype: 'toolbar',
                    ui: 'simple',
                    dock: 'top',
                    overlay: true,
                    layout: {
                        type: 'hbox',
                        pack: 'end'
                    },
                    margin: 0,
                    padding: '6 12 6 0',
                    style: 'z-index:2',
                    items: {
                        style: 'background:transparent;box-shadow:none',
                        iconCls: 'x-tool-img x-tool-close',
                        tooltip: 'Hide events',
                        handler: function() {
                            this.up('grid').hide();
                        }
                    }
                }]
            });
        }
        eventsGrid.columns[0].setText('Events (' + label + ')');
        eventsGrid.store.load({data: events});
        eventsGrid.show();
    },

    onShowChartViewDetails: function(id, name, label, datetime, data) {
        var me = this;
        if (me.subject === 'projects' && me.type === 'clouds') {
            Scalr.Request({
                processBox: {
                    type: 'action',
                    msg: 'Computing...'
                },
                url: '/analytics/projects/xGetProjectFarmsTopUsageOnDate',
                params: {
                    ccId: me.data['ccId'],
                    projectId: me.data['projectId'],
                    platform: id,
                    date: Ext.Date.format(datetime, 'Y-m-d H:i'),
                    mode: me.mode,
                    start: Ext.Date.format(me.startDate, 'Y-m-d'),
                    end: Ext.Date.format(me.endDate, 'Y-m-d')
                },
                success: function (res) {
                    var data2 = Ext.apply({}, data);
                    data2['farms'] = res['data'];
                    me.showChartViewDetails(id, name, label, datetime, data2);
                }
            });
        } else {
            me.showChartViewDetails.apply(me, arguments);
        }
    },

    showChartViewDetails: function(id, name, label, datetime, data) {
        var me = this,
            chartWrapper = me.down('#chartWrapper'),
            details = chartWrapper.down('#details'),
            detailsItemsType = me.type === 'clouds' ? (data['projects'] ? 'projects' : 'farms') : 'clouds',
            detailsItems = data[detailsItemsType],
            titleData, headerData, projectCostMax = 0;
        titleData = {label: label};

        chartWrapper.suspendLayouts();
        
        Ext.Array.each(detailsItems, function(item){
            projectCostMax = projectCostMax > item['cost'] ? projectCostMax : item['cost'];
            item.type = detailsItemsType;
        });

        headerData = Ext.applyIf({
            rawName: name,
            name: me.getColoredItemTitle(me.type, id, name, true),
            projectCostMax: projectCostMax
        }, data);

        if (!details) {
            details = chartWrapper.add({
                xtype: 'container',
                itemId: 'details',
                flex: 1,
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                margin: '18 10 0 0',
                items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    items: [{
                        xtype: 'component',
                        itemId: 'title',
                        cls: 'x-caheader',
                        tpl: '{label}',
                        data: titleData
                    },{
                        xtype: 'tbfill'
                    },{
                        xtype: 'button',
                        width: 120,
                        text: 'Back to total',
                        handler: function(){
                            me.showChartViewTotals();
                        }
                    }]
                },{
                    xtype: 'component',
                    itemId: 'header',
                    cls: 'x-costanalytics-details-header',
                    data: headerData,
                    tpl: new Ext.XTemplate(
                        '<table>' +
                            '<tr class="title">' +
                                '<td style="width:180px;" class="title" rowspan="2" title="{rawName:htmlEncode}">{name}</td>' +
                                '<td>Total spend:</td>' +
                                '<td style="width:80px">&nbsp;</td>' +
                                '<td style="width:170px">Growth from prev {[this.getMode()]}:</td>' +
                                '<td style="width:170px">Growth from prev {[this.getIntervalTitle()]}:</td>' +
                            '</tr>' +
                            '<tr class="value">' +
                                '<td style="overflow:visible">{[this.currency(values.cost)]} ({[this.currency(values.prevCost)]} previous {[this.getMode()]})</td>' +
                                '<td style="width:80px">&nbsp;</td>' +
                                '<td>' +
                                    '<tpl if="growth!=0">' +
                                        '{[this.pctLabel(values.growth, values.growthPct, \'small\', \'fixed\')]}' +
                                    '</tpl>'+
                                '</td>' +
                                '<td>' +
                                    '<tpl if="growthPrevPoint!=0">' +
                                        '{[this.pctLabel(values.growthPrevPoint, values.growthPrevPointPct, \'small\', \'fixed\')]}' +
                                    '</tpl>'+
                                '</td>' +
                            '</tr>' +
                        '</table>',
                        {
                            getMode: function(){
                                return me.mode;
                            },
                            getIntervalTitle: function(){
                                return me.interval;
                            }
                        }
                    )
                },{
                    xtype: 'dataview',
                    itemId: 'body',
                    flex: 1,
                    cls: 'x-costanalytics-details',
                    itemSelector: '.x-item',
                    autoScroll: true,
                    store: {
                        proxy: 'object',
                        fields: ['id', 'name', 'cost', 'costPct', 'growth', 'growthPct', 'growthPrevPoint', 'growthPrevPointPct', 'type', 'environment'],
                        sorters: {
                            property: 'cost',
                            direction: 'DESC'
                        },
                        data: detailsItems
                    },
                    collectData: function(records, startIndex){
                        var data = this.headerData,
                            i = 0,
                            len = records.length,
                            record;
                        data.items = [];
                        for (; i < len; i++) {
                            record = records[i];
                            data.items[i] = this.prepareData(record.data, startIndex + i, record);
                        }
                        return data;
                    },
                    tpl: new Ext.XTemplate(
                        '<table>' +
                            '<tpl if="items.length">' +
                                '<tpl for="items">' +
                                    '<tr class="x-item">' +
                                        '<td style="width:180px" data-qtip="{[this.farmInfo(values, true)]}">{[this.getItemTitle(values.type, values.id, values.name)]}</td>' +
                                        '<td><div><div class="bar-inner" style="margin:0;width:{[parent.projectCostMax?values.cost/parent.projectCostMax*100:0]}%"><span>{[this.currency(values.cost)]}</span></div></div></td>' +
                                        '<td style="width:80px;text-align:center">{costPct:round(2)}%</td>' +
                                        '<td style="width:170px">' +
                                            '<tpl if="growth!=0">' +
                                                '{[this.pctLabel(values.growth, values.growthPct, \'small\', \'fixed\')]}' +
                                            '</tpl>'+
                                        '</td>' +
                                        '<td style="width:170px">' +
                                            '<tpl if="growthPrevPoint!=0">' +
                                                '{[this.pctLabel(values.growthPrevPoint, values.growthPrevPointPct, \'small\', \'fixed\')]}' +
                                            '</tpl>'+
                                        '</td>' +
                                    '</tr>' +
                                '</tpl>' +
                            '<tpl else>' +
                                '<tr><td class="x-empty">No spend details found</td></tr>' +
                            '</tpl>' +
                        '</table>'
                        ,
                        {
                            getItemTitle: function(type, id, name){
                                var res = me.getItemTitle(type, id, name);
                                if (type === 'projects' && id) {
                                    res = '<a href="#/analytics/projects?projectId='+id+'">' + res + '</a>';
                                }
                                return res;
                            }
                        }
                    ),
                    headerData: headerData
                }]
            });
        } else {
            details.down('#title').update(titleData);
            details.down('#header').update(headerData);
            details.down('dataview').headerData = headerData;
            details.down('dataview').store.loadData(detailsItems);
        }
        details.show();
        chartWrapper.down('#totals').hide();
        chartWrapper.resumeLayouts(true);
    },

    selectPieView: function() {
        var me = this,
            viewWrapper = me.down('#viewWrapper'),
            pieWrapper = viewWrapper.getComponent('pieWrapper'),
            pie,
            data = me.data['totals'][me.type],
            hideChart = me.data['totals']['cost'] == 0,
            nameColumnTitle = me.type === 'clouds' ? 'Cloud' : (me.type === 'projects' ? 'Project' : 'Farm');
        viewWrapper.suspendLayouts();
        if (!pieWrapper) {
            pieWrapper = viewWrapper.add({
                xtype: 'container',
                itemId: 'pieWrapper',
                margin: '0 10',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                }
            });
        }
        pie = pieWrapper.getComponent('pie');
        if (!pie) {
            var cloudStore = {
                proxy: 'object',
                fields: [{name: 'id', type: 'string'}, 'name', 'cost', 'costPct', 'prevCost', 'prevCostPct', 'growth', 'growthPct', 'curPrevPctGrowth', 'clouds', 'projects', 'farms'],
                sorters: {
                    property: 'cost',
                    direction: 'DESC'
                },
                data: data
            };
            pie = pieWrapper.add({
                xtype: 'container',
                itemId: 'pie',
                layout: {
                    type: 'hbox',
                    align: 'middle'
                },
                items: [{
                    xtype: 'chart',
                    animate: true,
                    store: cloudStore,
                    shadow: false,
                    insetPadding: 0,
                    width: 160,
                    height: 160,
                    theme: 'Scalr',
                    hidden: hideChart,
                    series: [{
                        type: 'pie',
                        field: 'cost',
                        donut: 24,
                        renderer: function(sprite, record, attr, index, store){
                            return Ext.apply(attr, {fill: me.getItemColor(record.get('id'), me.type)});
                        },
                        tips: {
                            trackMouse: true,
                            hideDelay: 0,
                            showDelay: 0,
                            tpl: '{[this.itemCost(values)]}',
                            renderer: function(record, item) {
                                this.update({
                                    id: record.get('id'),
                                    type: me.type,
                                    name: me.type === 'clouds' ? Scalr.utils.getPlatformName(record.get('name')) : record.get('name'),
                                    cost: record.get('cost'),
                                    costPct: record.get('costPct')
                                });
                            }
                        }
                    }]
                },{
                    xtype: 'grid',
                    cls: 'x-grid-shadow',
                    store: cloudStore,
                    flex: 1,
                    maxHeight: 224,
                    margin: '0 0 0 16',
                    features: [{
                        ftype: 'summary',
                        id: 'summary',
                        dock: 'bottom'
                    }],
                    viewConfig: {
                        emptyText: 'No data for selected period',
                        deferEmptyText: false
                    },
                    listeners: {
                        selectionchange: function(grid, selected) {
                            if (selected.length > 0) {
                                me.showPieViewDetails(selected[0].getData());
                            } else {
                                pieWrapper.down('#details').hide();
                            }
                        }
                    },
                    columns: [{
                        header: nameColumnTitle,
                        dataIndex: 'name',
                        sortable: false,
                        width: 220,
                        xtype: 'templatecolumn',
                        tpl: new Ext.XTemplate(
                            '{[this.getColoredName(values.id, values.name)]}',
                        {
                            getColoredName: function(id, name){
                                return me.getColoredItemTitle(me.type, id, name, true);
                            }
                        }),
                        summaryRenderer: function(){
                            return (me.subject === 'projects' ? 'Project' : 'Cost center') + ' total:';
                        }
                    },{
                        header: Ext.String.capitalize(me.getPeriodTitle()) + ' total',
                        dataIndex: 'cost',
                        xtype: 'templatecolumn',
                        flex: 1,
                        maxWidth: 240,
                        tpl: '{[this.currency(values.cost)]} {[values.costPct>0 ? \'(\'+values.costPct+\'%)\' : \'\']}',
                        summaryRenderer: function(){
                            return Ext.util.Format.currency(Math.round(me.data['totals']['cost']), null, 0);
                        }
                    },{
                        header: 'Previous ' + me.getPeriodTitle(),
                        dataIndex: 'prevCost',
                        xtype: 'templatecolumn',
                        flex: 1,
                        tpl: new Ext.XTemplate('<tpl if="prevCost">{[this.currency(values.prevCost)]} ({prevCostPct}%)</tpl>', {
                            getPoints: function(values){
                                return values.curPrevPctGrowth != 0 ? '<span style="color:#'+(values.curPrevPctGrowth>0 ?'d81911':'46a557')+'">('+(values.curPrevPctGrowth>0?'+':'&ndash;')+Math.abs(values.curPrevPctGrowth)+')</span>' : '';
                            }
                        }),
                        summaryRenderer: function(){
                            return me.data['totals']['cost'] > 0 && me.data['totals']['prevCost'] > 0 ? Ext.util.Format.currency(Math.round(me.data['totals']['prevCost']), null, 0) : '';
                        }
                    }]
                }]
            });
        } else {
            var grid = pie.down('grid'),
                chart = pie.down('chart'),
                selected = [];
            pie.suspendLayouts();
            chart.store.loadData(data);

            grid.getSelectionModel().selected.each(function(rec){
                selected.push(rec.get('id'));
            });
            grid.getSelectionModel().deselectAll();
            grid.store.loadData(data);
            grid.columns[0].setText(nameColumnTitle);
            grid.columns[1].setText(Ext.String.capitalize(me.getPeriodTitle()) + ' total');
            grid.columns[2].setText('Previous ' + me.getPeriodTitle());
            if (selected.length > 0) {
                var selection = [];
                Ext.Array.each(selected, function(id){
                    var rec = grid.store.getById(id);
                    if (rec) selection.push(rec);
                });
                grid.getSelectionModel().select(selection);
            } else {
                var details = pieWrapper.down('#details');
                if (details) details.hide();
            }
            pie.resumeLayouts(true);
            chart.setVisible(!hideChart);
        }

        viewWrapper.layout.setActiveItem(pieWrapper);
        viewWrapper.resumeLayouts(true);
    },
    
    showPieViewDetails: function(data) {
        var me = this,
            pieWrapper = me.down('#pieWrapper'),
            details = pieWrapper.down('#details'),
            detailsItemsType = me.type === 'clouds' ? (data['projects'] ? 'projects' : 'farms') : 'clouds',
            detailsItems = data[detailsItemsType],
            headerData, projectCostMax = 0;

        Ext.Array.each(detailsItems, function(item){
            projectCostMax = projectCostMax > item['cost'] ? projectCostMax : item['cost'];
            item.type = detailsItemsType;
        });

        headerData = Ext.applyIf({
            rawName: data['name'],
            name: me.getColoredItemTitle(me.type, data['id'], data['name'], true),
            projectCostMax: projectCostMax
        }, data);

        if (!details) {
            details = pieWrapper.add({
                xtype: 'container',
                itemId: 'details',
                flex: 1,
                margin: '12 0 0',
                layout: {
                    type: 'vbox',
                    align: 'stretch'
                },
                items: [{
                    xtype: 'component',
                    itemId: 'header',
                    cls: 'x-costanalytics-details-header',
                    data: headerData,
                    tpl: new Ext.XTemplate(
                        '<table>' +
                            '<tr class="title">' +
                                '<td style="width:180px;" class="title" rowspan="2" title="{rawName:htmlEncode}">{name}</td>' +
                                '<td>{[this.getPeriodTitle(true)]} spend:</td>' +
                                '<td style="width:80px;">&nbsp;</td>' +
                                '<td style="width:150px;">Previous {[this.getPeriodTitle()]}:</td>' +
                                '<td style="width:130px;">Growth:</td>' +
                            '</tr>' +
                            '<tr class="value">' +
                                '<td>{[this.currency(values.cost)]}</td>' +
                                '<td>&nbsp;</td>' +
                                '<td>{[this.currency(values.prevCost)]}</td>' +
                                '<td>' +
                                    '<tpl if="growth!=0">' +
                                        '{[this.pctLabel(values.growth, values.growthPct, \'small\', \'fixed\')]}' +
                                    '</tpl>'+
                                '</td>' +
                            '</tr>' +
                        '</table>',
                        {
                            getMode: function(){
                                return me.mode;
                            },
                            getPeriodTitle: function(capitalize){
                                return me.getPeriodTitle(capitalize);
                            }
                        }
                    )
                },{
                    xtype: 'dataview',
                    itemId: 'body',
                    flex: 1,
                    cls: 'x-costanalytics-details',
                    itemSelector: '.x-item',
                    autoScroll: true,
                    store: {
                        proxy: 'object',
                        fields: ['id', 'name', 'cost', 'costPct', 'prevCost', 'growth', 'growthPct', 'growthPrevPoint', 'growthPrevPointPct', 'type'],
                        sorters: {
                            property: 'cost',
                            direction: 'DESC'
                        },
                        data: detailsItems
                    },
                    collectData: function(records, startIndex){
                        var data = this.headerData,
                            i = 0,
                            len = records.length,
                            record;
                        data.items = [];
                        for (; i < len; i++) {
                            record = records[i];
                            data.items[i] = this.prepareData(record.data, startIndex + i, record);
                        }
                        return data;
                    },
                    tpl: new Ext.XTemplate(
                        '<table>' +
                            '<tpl if="items.length">' +
                                '<tpl for="items">' +
                                    '<tr class="x-item">' +
                                        '<td style="width:180px" title="{name:htmlEncode}">{[this.getItemTitle(values.type, values.id, values.name)]}</td>' +
                                        '<td><div><div class="bar-inner" style="margin:0;width:{[parent.projectCostMax?values.cost/parent.projectCostMax*100:0]}%"><span>{[this.currency(values.cost)]}</span></div></div></td>' +
                                        '<td style="width:80px">{costPct:round(2)}%</td>' +
                                        '<td style="width:150px">{[this.currency(values.prevCost)]}</td>' +
                                        '<td style="width:130px">' +
                                            '<tpl if="growth!=0">' +
                                                '{[this.pctLabel(values.growth, values.growthPct, \'small\', \'fixed\')]}' +
                                            '</tpl>'+
                                        '</td>' +
                                    '</tr>' +
                                '</tpl>' +
                            '<tpl else>' +
                                '<tr><td class="x-empty">No spend details found</td></tr>' +
                            '</tpl>' +
                        '</table>'
                        ,
                        {
                            getItemTitle: function(type, id, name){
                                var res = me.getItemTitle(type, id, name);
                                if (type === 'projects' && id) {
                                    res = '<a href="#/analytics/projects?projectId='+id+'">' + res + '</a>';
                                }
                                return res;
                            }
                        }
                    ),
                    headerData: headerData
                }]
            });
        } else {
            details.down('#header').update(headerData);
            details.down('dataview').headerData = headerData;
            details.down('dataview').store.loadData(detailsItems);
        }
        details.show();
    },
    
    selectGridView: function() {
        var me = this,
            viewWrapper = me.down('#viewWrapper'),
            grid = viewWrapper.down('#dailyGrid'),
            gridCt,
            timeline = me.data['timeline'],
            spendsGridHash = timeline[0]['datetime'] + timeline[timeline.length-1]['datetime'] + timeline.length,
            reconfigureColumns = spendsGridHash !== me.spendsGridHash,
            nameColumnTitle = me.type === 'clouds' ? 'Cloud' : (me.type === 'projects' ? 'Project' : 'Farm'),
            data = {},
            fields = ['type', 'id', 'name'],
            columns;

        if (reconfigureColumns) {
            columns = [{
                header: nameColumnTitle,
                dataIndex: 'name',
                width: 200,
                locked: true,
                resizeable: false,
                sortable: false,
                xtype: 'templatecolumn',
                tpl: new Ext.XTemplate(
                    '{[this.getItemName(values.id, values.name)]}',
                {
                    getItemName: function(id, name){
                        return me.getItemTitle(me.type, id, name, true);
                    }
                }),
                summaryRenderer: function(value) {
                    return '<span style="color:#46a557;font-weight:bold;line-height:28px">Total spent:</span>';
                }
            }];
        }
        var todayColumnIndex;
        Ext.Array.each(timeline, function(item, index){
            if(todayColumnIndex === undefined && Ext.Date.parse(item.datetime, 'Y-m-d H:i') > Scalr.utils.Quarters.getDate()) {
                todayColumnIndex = index;
            }
            fields.push('col'+index+'_1', 'col'+index+'_2');
            Ext.Object.each(me.data[me.type], function(key, value){
                data[key] = data[key] || [me.type, key, value['name']];
                if (value['data'][index]) {
                    data[key].push(value['data'][index]['cost'], value['data'][index]['growthPct']);
                } else {
                    data[key].push(0, 0);
                }
            });
            if (reconfigureColumns) {
                columns.push({
                    header: item.label,
                    dataIndex: 'col'+index+'_1',
                    xtype: 'templatecolumn',
                    sortable: false,
                    minWidth: 160,
                    summaryType: 'sum',
                    summaryRenderer: function(value) {
                        return value > 0 ? Ext.String.format('<span style="color:#46a557;font-weight:bold;line-height:28px">{0}</span>', Ext.util.Format.currency(Math.round(value), null, 0)) : '';
                    },
                    tpl: '<tpl if="col'+index+'_1">{[this.currency(values.col'+index+'_1)]} <span style="color:#999">({[values.col'+index+'_2>0?\'+\':\'\']}{col'+index+'_2:round(2)}%)</span></tpl>'
                });
            }
        });

        scrollToColumn = function(columnIndex){
            if (columnIndex) {
                if (this.viewReady) {
                    this.scrollBy(this.getGridColumns()[columnIndex-1].getPosition(true)[0], 0, false);
                } else {
                    this.on('viewready', function(){
                        this.scrollBy(this.getGridColumns()[columnIndex-1].getPosition(true)[0], 0, false);
                    }, this, {single: true});
                }
            }
        }
        if (!grid) {
            gridCt = viewWrapper.add({
                xtype: 'container',
                items: {
                    xtype: 'grid',
                    itemId: 'dailyGrid',
                    features: [{
                        ftype: 'summary',
                        id: 'summary'
                    }],
                    listeners: {
                        boxready: function() {
                            scrollToColumn.call(this.view.normalView, todayColumnIndex);
                        }
                        /*reconfigure: function() {
                            scrollToColumn.call(this.view.normalView, this.todayColumnIndex);
                        }*/
                    },
                    /*viewConfig: {
                        preserveScrollOnRefresh: false
                    },*/
                    cls: 'x-grid-locked-shadow x-grid-no-highlighting',
                    store: Ext.create('Ext.data.ArrayStore', {
                        fields: fields,
                        data: Ext.Object.getValues(data)
                    }),
                    columns: columns
                }
            });
            grid = gridCt.down();
        } else {
            gridCt = grid.up();
            grid.reconfigure(Ext.create('Ext.data.ArrayStore', {
                fields: fields,
                data: Ext.Object.getValues(data)
            }), columns);
            grid.columns[0].setText(nameColumnTitle);
        }
        me.spendsGridHash = spendsGridHash;

        viewWrapper.layout.setActiveItem(gridCt);
    }

});

Ext.define('Scalr.ui.CostAnalyticsChartSummary', {
	extend: 'Ext.chart.Chart',
    alias: 'widget.costanalyticssummary',

    theme: 'Scalr',
    animate: true,
    fieldsConfig: [],
    loadData: function(data) {
        this.series.each(function(series){
            series.highlight = true;
            series.unHighlightItem();
            series.cleanHighlights();
            series.highlight = false;
        });
        this.store.loadData(Ext.Array.map(data, function(item){
            return {
                cost: item.cost,
                label: item.label,
                xLabel: item.onchart,
                datetime: item.datetime
            };
        }));
        this.fireEvent('afterload');
    },
    axes: [{
        type: 'Numeric',
        position: 'left',
        fields: ['cost'],
        label: {
            renderer: function(value){return value > 0 ? Ext.util.Format.currency(value, null, value >= 5 ? 0 : 2) : 0}
        },
        style : {
            stroke : 'red'
        },
        grid: {
            even: {
                fill: '#f3f6f8',
                stroke: '#eaf0f4',
                height: 1
            },
            odd: {
                fill: '#f3f6f8',
                stroke: '#eaf0f4',
                height: 1
            }
        },
        minimum: 0,
        majorTickSteps: 3
    },{
        type: 'Category',
        position: 'bottom',
        dateFormat: 'M d',
        fields: ['xLabel']
    }],
    series: [{
        type: 'bar',
        column: true,
        yPadding: 0,
        shadowAttributes: [],
        axis: 'left',
        xField: 'xLabel',
        yField: ['cost'],
        style: {
            'stroke-width': 1,
            cursor: 'pointer'
        },
        renderer: function(sprite, record, attr, index, store){
            return Ext.apply(attr, {fill: sprite._highlighted ? '2581b8' : 'b4cede'});
        },
        listeners: {
            itemclick: function(item) {
                var series = item.series, items;
                series.highlight = true;
                series.unHighlightItem();
                series.cleanHighlights();
                series.highlightItem(item);
                series.highlight = false;
                this.chart.fireEvent('itemclick', item);
            }
        },
        highlight: false,
        highlightCfg: {
            fill: '2581b8',
            stroke: null
        },
        tips: {
            trackMouse: true,
            //anchor: 'top',
            hideDelay: 0,
            showDelay: 0,
            tpl: '<div style="text-align:center">Spent <b>{[this.currency(values.cost)]}</b> on <b>{label}</b></div>',
            renderer: function(record, item) {
                this.update(record.getData());
            }
        }
    }]
});

Ext.define('Ext.picker.Quarter', {
    extend: 'Ext.picker.Month',
    alias: 'widget.quarterpicker',
    cls: 'x-quarterpicker',

    beforeRender: function(){
        var me = this,
            i = 0,
            months = ['Q1', 'Q2', 'Q3', 'Q4'],
            margin = me.monthMargin,
            style = '';

        if (me.padding && !me.width) {
            me.cacheWidth();
        }

        me.callParent();

        if (Ext.isDefined(margin)) {
            style = 'margin: 0 ' + margin + 'px;';
        }

        Ext.apply(me.renderData, {
            months: months,
            years: me.getYears(),
            showButtons: me.showButtons,
            monthStyle: style
        });
    },

    setValue: function(value){
        var me = this,
            active = me.activeYear,
            year;

        if (!value) {
            me.value = [null, null];
        } else if (Ext.isDate(value)) {
            var quarter = Scalr.utils.Quarters.getPeriodForDate(value);
            me.value = [quarter['quarter'] - 1, quarter['year']];
        } else {
            me.value = [value[0], value[1]];
        }
        
        if (me.rendered) {
            year = me.value[1];
            if (year !== null) {
                if ((year < active || year > active + me.yearOffset)) {
                    me.activeYear = year - me.yearOffset + 1;
                }
            }
            me.updateBody();
        }

        return me;
    },

    updateBody: function(){
        var me = this,
            years = me.years,
            months = me.months,
            yearNumbers = me.getYears(),
            cls = me.selectedCls,
            value = me.getYear(null),
            month = me.value[0],
            monthOffset = me.monthOffset,
            year, maxYear, minYear,
            monthItems, m, mr, mLen,
            yearItems, y, yLen, el,
            quarter;

        if (me.rendered) {
            years.removeCls(cls);
            months.removeCls(cls);

            if (me.maxDate) {
                maxYear = me.maxDate.getFullYear();
                quarter = Scalr.utils.Quarters.getPeriodForDate(me.maxDate)['quarter'];
            }
            if (me.minDate) {
                minYear = me.minDate.getFullYear();
            }

            
            if (quarter !== undefined) {
                monthItems = months.elements;
                mLen      = monthItems.length;
                for (m = 0; m < mLen; m++) {
                    el = Ext.fly(monthItems[m]);
                    if (value == maxYear && m+1 > quarter) {
                        el.parent().addCls('x-item-disabled');
                    } else {
                        el.parent().removeCls('x-item-disabled');
                    }

                }
            }

            yearItems = years.elements;
            yLen      = yearItems.length;

            for (y = 0; y < yLen; y++) {
                el = Ext.fly(yearItems[y]);

                year = yearNumbers[y];
                el.dom.innerHTML = year;
                if (year == value) {
                    el.addCls(cls);
                }

                if (maxYear && year > maxYear || minYear && year < minYear) {
                    el.parent().addCls('x-item-disabled');
                } else {
                    el.parent().removeCls('x-item-disabled');
                }

            }
            if (month !== null) {
                months.item(month).addCls(cls);
            }
        }
    },

    onMonthClick: function(target, isDouble){
        var me = this;
        me.value[0] = me.months.indexOf(target);
        me.updateBody();
        me.fireEvent('month' + (isDouble ? 'dbl' : '') + 'click', me, me.value);
        me.fireEvent('select', me, me.value);
    }


});

Ext.define('Ext.picker.Year', {
    extend: 'Ext.picker.Month',
    alias: 'widget.yearpicker',
    cls: 'x-yearpicker',
    yearOffset: 3,
    totalYears: 12,
    
    beforeRender: function(){
        var me = this,
            i = 0,
            months = [0],
            margin = me.monthMargin,
            style = '';

        if (me.padding && !me.width) {
            me.cacheWidth();
        }

        me.callParent();

        if (Ext.isDefined(margin)) {
            style = 'margin: 0 ' + margin + 'px;';
        }

        Ext.apply(me.renderData, {
            months: months,
            years: me.getYears(),
            showButtons: me.showButtons,
            monthStyle: style
        });
    },

    setValue: function(value){
        var me = this,
            active = me.activeYear,
            year;

        if (!value) {
            me.value = [null, null];
        } else if (Ext.isDate(value)) {
            me.value = [0, value.getFullYear()];
        } else {
            me.value = [value[0], value[1]];
        }

        if (me.rendered) {
            year = me.value[1];
            if (year !== null) {
                if ((year < active || year > active + me.yearOffset)) {
                    me.activeYear = year - me.yearOffset + 1;
                }
            }
            me.updateBody();
        }

        return me;
    },

    updateBody: function(){
        var me = this,
            years = me.years,
            yearNumbers = me.getYears(),
            cls = me.selectedCls,
            value = me.getYear(null),
            year, maxYear, minYear,
            yearItems, y, yLen, el;

        if (me.rendered) {
            years.removeCls(cls);

            if (me.maxDate) {
                maxYear = me.maxDate.getFullYear();
            }
            if (me.minDate) {
                minYear = me.minDate.getFullYear();
            }

            yearItems = years.elements;
            yLen      = yearItems.length;

            for (y = 0; y < yLen; y++) {
                el = Ext.fly(yearItems[y]);

                year = yearNumbers[y];
                el.dom.innerHTML = year;
                if (year == value) {
                    el.addCls(cls);
                }

                if (maxYear && year > maxYear || minYear && year < minYear) {
                    el.parent().addCls('x-item-disabled');
                } else {
                    el.parent().removeCls('x-item-disabled');
                }

            }
        }
    },

    getYears: function(){
        var me = this,
            offset = me.yearOffset,
            start = me.activeYear, // put the "active" year on the left
            end = start + offset,
            i = start,
            cols = Math.round(me.totalYears/me.yearOffset),
            years = [];

        for (; i < end; ++i) {
            for(var j=0;j<cols;j++) {
                years.push(i + offset*j);
            }
        }
        return years;
    },

    resolveOffset: function(index, offset){
        var cols = Math.ceil(this.totalYears/this.yearOffset);
        return Math.floor(index / cols) + (index%cols)*this.yearOffset;
    }

});


Ext.define('Scalr.ui.FormQuarterField', {
	extend: 'Ext.form.field.Date',
    alias: 'widget.quarterfield',

    valueToRaw: function(value) {
        var result = '', quarter;
        if (value) {
            quarter = Scalr.utils.Quarters.getPeriodForDate(value);
            result = quarter['shortTitle'];
        }
        return result;
    },
    
    rawToValue: function(value) {
        if (value && Ext.isString(value)) {
            var s = value.split(' '),
                quarter = Scalr.utils.Quarters.getPeriodForQuarter(s[0].replace('Q','')*1, s[1]*1);
            return quarter['startDate'];
        } else {
            return value;
        }
    },

    getErrors: function() {
        return [];
    },
    
    createPicker: function () {
        var me = this,
            format = Ext.String.format;
        return Ext.create('Ext.picker.Quarter', {
            pickerField: me,
            ownerCt: me.ownerCt,
            renderTo: document.body,
            floating: true,
            hidden: true,
            focusOnShow: true,
            minDate: me.minValue,
            maxDate: me.maxValue,
            disabledDatesRE: me.disabledDatesRE,
            disabledDatesText: me.disabledDatesText,
            disabledDays: me.disabledDays,
            disabledDaysText: me.disabledDaysText,
            format: me.format,
            showToday: me.showToday,
            startDay: me.startDay,
            minText: format(me.minText, me.formatDate(me.minValue)),
            maxText: format(me.maxText, me.formatDate(me.maxValue)),
            listeners: {
                select: {scope: me, fn: me.onSelect},
                monthdblclick: {scope: me, fn: me.onOKClick},
                yeardblclick: {scope: me, fn: me.onOKClick},
                OkClick: {scope: me, fn: me.onOKClick},
                CancelClick: {scope: me, fn: me.onCancelClick}
            },
            keyNavConfig: {
                esc: function () {
                    me.collapse();
                }
            }
        });
    },
    
    onCancelClick: function () {
        var me = this;
        me.selectMonth = null;
        me.collapse();
    },

    onOKClick: function () {
        var me = this;
        if (me.selectMonth) {
            me.setValue(me.selectMonth);
            me.fireEvent('select', me, me.selectMonth);
        }
        me.collapse();
    },

    onSelect: function (m, d) {
        var me = this;
        me.selectMonth = Scalr.utils.Quarters.getPeriodForQuarter(d[0] + 1, d[1])['startDate'];
    }

});

Ext.define('Scalr.ui.FormYearField', {
	extend: 'Ext.form.field.Date',
    alias: 'widget.yearfield',

    valueToRaw: function(value) {
        return value ? value.getFullYear() : '';
    },

    rawToValue: function(value) {
        if (value) {
            return Scalr.utils.Quarters.getDate(value+'-01-01');
        } else {
            return value;
        }
    },

    getErrors: function() {
        return [];
    },

    createPicker: function () {
        var me = this,
            format = Ext.String.format;
        return Ext.create('Ext.picker.Year', {
            pickerField: me,
            ownerCt: me.ownerCt,
            renderTo: document.body,
            floating: true,
            hidden: true,
            focusOnShow: true,
            minDate: me.minValue,
            maxDate: me.maxValue,
            disabledDatesRE: me.disabledDatesRE,
            disabledDatesText: me.disabledDatesText,
            disabledDays: me.disabledDays,
            disabledDaysText: me.disabledDaysText,
            format: me.format,
            showToday: me.showToday,
            startDay: me.startDay,
            minText: format(me.minText, me.formatDate(me.minValue)),
            maxText: format(me.maxText, me.formatDate(me.maxValue)),
            listeners: {
                select: {scope: me, fn: me.onSelect},
                monthdblclick: {scope: me, fn: me.onOKClick},
                yeardblclick: {scope: me, fn: me.onOKClick},
                OkClick: {scope: me, fn: me.onOKClick},
                CancelClick: {scope: me, fn: me.onCancelClick}
            },
            keyNavConfig: {
                esc: function () {
                    me.collapse();
                }
            }
        });
    },

    onCancelClick: function () {
        var me = this;
        me.selectMonth = null;
        me.collapse();
    },

    onOKClick: function () {
        var me = this;
        if (me.selectMonth) {
            me.setValue(me.selectMonth);
            me.fireEvent('select', me, me.selectMonth);
        }
        me.collapse();
    },
    
    onSelect: function (m, d) {
        var me = this;
        me.selectMonth = Scalr.utils.Quarters.getDate(d[1]+'-01-01');
    }

});

Ext.define('Scalr.ui.FormMonthField', {
	extend: 'Ext.form.field.Date',
    alias: 'widget.monthfield',

    initTime: '01 00:00:00',
    initTimeFormat: 'd H:i:s',
    format: 'F Y',
    createPicker: function () {
        var me = this,
            format = Ext.String.format;
        return Ext.create('Ext.picker.Month', {
            pickerField: me,
            ownerCt: me.ownerCt,
            renderTo: document.body,
            floating: true,
            hidden: true,
            focusOnShow: true,
            minDate: me.minValue,
            maxDate: me.maxValue,
            disabledDatesRE: me.disabledDatesRE,
            disabledDatesText: me.disabledDatesText,
            disabledDays: me.disabledDays,
            disabledDaysText: me.disabledDaysText,
            format: me.format,
            showToday: me.showToday,
            startDay: me.startDay,
            minText: format(me.minText, me.formatDate(me.minValue)),
            maxText: format(me.maxText, me.formatDate(me.maxValue)),
            listeners: {
                select: {scope: me, fn: me.onSelect},
                monthdblclick: {scope: me, fn: me.onOKClick},
                yeardblclick: {scope: me, fn: me.onOKClick},
                OkClick: {scope: me, fn: me.onOKClick},
                CancelClick: {scope: me, fn: me.onCancelClick}
            },
            keyNavConfig: {
                esc: function () {
                    me.collapse();
                }
            }
        });
    },
    
    onCancelClick: function () {
        var me = this;
        me.selectMonth = null;
        me.collapse();
    },

    onOKClick: function () {
        var me = this;
        if (me.selectMonth) {
            me.setValue(me.selectMonth);
            me.fireEvent('select', me, me.selectMonth);
        }
        me.collapse();
    },

    onSelect: function (m, d) {
        var me = this;
        me.selectMonth = Scalr.utils.Quarters.getDate(d[1]+'-0'+(d[0]+1)+'-01');
    }

});
