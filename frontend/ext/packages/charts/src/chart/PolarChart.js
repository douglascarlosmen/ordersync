/**
 * @class Ext.chart.PolarChart
 * @extends Ext.chart.AbstractChart
 * @xtype polar
 *
 * Represent a chart that uses polar coordinates.
 * A polar chart has two axes: an angular axis (which is a circle) and
 * a radial axis (a straight line from the center to the edge of the circle).
 * The angular axis is usually a Category axis while the radial axis is
 * typically numerical. 
 *
 * Pie charts and Radar charts are common examples of Polar charts.
 *
 * Please check out the summary for the {@link Ext.chart.AbstractChart} as well,
 * for helpful tips and important details.
 *
 */
Ext.define('Ext.chart.PolarChart', {
    extend: 'Ext.chart.AbstractChart',
    requires: [
        'Ext.chart.grid.CircularGrid',
        'Ext.chart.grid.RadialGrid'
    ],
    xtype: 'polar',
    isPolar: true,

    config: {
        /**
         * @cfg {Array} center Determines the center of the polar chart.
         * Updated when the chart performs layout.
         */
        center: [0, 0],
        /**
         * @cfg {Number} radius Determines the radius of the polar chart.
         * Updated when the chart performs layout.
         */
        radius: 0,

        /**
         * @cfg {Number} innerPadding The amount of inner padding in pixels.
         * Inner padding is the padding from the outermost angular axis to the series.
         */
        innerPadding: 0
    },

    getDirectionForAxis: function(position) {
        return position === 'radial' ? 'Y' : 'X';
    },

    updateCenter: function(center) {
        var me = this,
            axes = me.getAxes(),
            series = me.getSeries(),
            i, ln, axis, seriesItem;

        for (i = 0, ln = axes.length; i < ln; i++) {
            axis = axes[i];
            axis.setCenter(center);
        }

        for (i = 0, ln = series.length; i < ln; i++) {
            seriesItem = series[i];
            seriesItem.setCenter(center);
        }
    },

    applyInnerPadding: function(padding, oldPadding) {
        return Ext.isNumber(padding) ? padding : oldPadding;
    },

    updateInnerPadding: function() {
        if (!this.isConfiguring) {
            this.performLayout();
        }
    },

    doSetSurfaceRect: function(surface, rect) {
        var mainRect = this.getMainRect();

        surface.setRect(rect);
        surface.matrix.set(1, 0, 0, 1, mainRect[0] - rect[0], mainRect[1] - rect[1]);
        surface.inverseMatrix.set(1, 0, 0, 1, rect[0] - mainRect[0], rect[1] - mainRect[1]);
    },

    applyAxes: function(newAxes, oldAxes) {
        var me = this,
            firstSeries = Ext.Array.from(me.config.series)[0],
            i, ln, axis, foundAngular;

        if (firstSeries && firstSeries.type === 'radar' && newAxes && newAxes.length) {
            // For compatibility with ExtJS: add a default angular axis if it's missing
            for (i = 0, ln = newAxes.length; i < ln; i++) {
                axis = newAxes[i];

                if (axis.position === 'angular') {
                    foundAngular = true;
                    break;
                }
            }

            if (!foundAngular) {
                newAxes.push({
                    type: 'category',
                    position: 'angular',
                    fields: firstSeries.xField || firstSeries.angleField,
                    style: {
                        estStepSize: 1
                    },
                    grid: true
                });
            }
        }

        return this.callParent([newAxes, oldAxes]);
    },

    performLayout: function() {
        var me = this,
            applyThickness = true;

        try {
            me.chartLayoutCount++;
            me.suspendAnimation();

            if (this.callParent() === false) {
                applyThickness = false;

                // Animation will be decremented in finally block
                return;
            }

            me.suspendThicknessChanged();

            // eslint-disable-next-line vars-on-top
            var chartRect = me.getSurface('chart').getRect(),
                inset = me.getInsetPadding(),
                inner = me.getInnerPadding(),
                shrinkBox = Ext.apply({}, inset),
                width = Math.max(1, chartRect[2] - chartRect[0] - inset.left - inset.right),
                height = Math.max(1, chartRect[3] - chartRect[1] - inset.top - inset.bottom),
                mainRect = [
                    chartRect[0] + inset.left,
                    chartRect[1] + inset.top,
                    width + chartRect[0],
                    height + chartRect[1]
                ],
                seriesList = me.getSeries(),
                innerWidth = width - inner * 2,
                innerHeight = height - inner * 2,
                center = [
                    (chartRect[0] + innerWidth) * 0.5 + inner,
                    (chartRect[1] + innerHeight) * 0.5 + inner
                ],
                radius = Math.min(innerWidth, innerHeight) * 0.5,
                axes = me.getAxes(),
                angularAxes = [],
                radialAxes = [],
                seriesRadius = radius - inner,
                grid = me.surfaceMap.grid,
                captionList = me.captionList,
                i, ln, shrinkRadius, floating, floatingValue,
                gaugeSeries, gaugeRadius, side, series,
                axis, thickness, halfLineWidth,
                caption;

            me.setMainRect(mainRect);

            me.doSetSurfaceRect(me.getSurface(), mainRect);

            if (grid) {
                for (i = 0, ln = grid.length; i < ln; i++) {
                    me.doSetSurfaceRect(grid[i], chartRect);
                }
            }

            for (i = 0, ln = axes.length; i < ln; i++) {
                axis = axes[i];

                switch (axis.getPosition()) {
                    case 'angular':
                        angularAxes.push(axis);
                        break;

                    case 'radial':
                        radialAxes.push(axis);
                        break;
                }
            }

            for (i = 0, ln = angularAxes.length; i < ln; i++) {
                axis = angularAxes[i];
                floating = axis.getFloating();
                // eslint-disable-next-line no-unused-vars
                floatingValue = floating ? floating.value : null;
                me.doSetSurfaceRect(axis.getSurface(), chartRect);
                thickness = axis.getThickness();

                for (side in shrinkBox) {
                    shrinkBox[side] += thickness;
                }

                width = chartRect[2] - shrinkBox.left - shrinkBox.right;
                height = chartRect[3] - shrinkBox.top - shrinkBox.bottom;
                shrinkRadius = Math.min(width, height) * 0.5;

                if (i === 0) {
                    seriesRadius = shrinkRadius - inner;
                }

                axis.setMinimum(0);
                axis.setLength(shrinkRadius);
                axis.getSprites();
                halfLineWidth = axis.sprites[0].attr.lineWidth * 0.5;

                for (side in shrinkBox) {
                    shrinkBox[side] += halfLineWidth;
                }
            }

            for (i = 0, ln = radialAxes.length; i < ln; i++) {
                axis = radialAxes[i];
                me.doSetSurfaceRect(axis.getSurface(), chartRect);
                axis.setMinimum(0);
                axis.setLength(seriesRadius);
                axis.getSprites();
            }

            for (i = 0, ln = seriesList.length; i < ln; i++) {
                series = seriesList[i];

                if (series.type === 'gauge' && !gaugeSeries) {
                    gaugeSeries = series;
                }
                else {
                    series.setRadius(seriesRadius);
                }

                me.doSetSurfaceRect(series.getSurface(), mainRect);
            }

            me.doSetSurfaceRect(me.getSurface('overlay'), chartRect);

            if (gaugeSeries) {
                gaugeSeries.setRect(mainRect);
                gaugeRadius = gaugeSeries.getRadius() - inner;
                me.setRadius(gaugeRadius);
                me.setCenter(gaugeSeries.getCenter());
                gaugeSeries.setRadius(gaugeRadius);

                if (axes.length && axes[0].getPosition() === 'gauge') {
                    axis = axes[0];
                    me.doSetSurfaceRect(axis.getSurface(), chartRect);
                    axis.setTotalAngle(gaugeSeries.getTotalAngle());
                    axis.setLength(gaugeRadius);
                }
            }
            else {
                me.setRadius(radius);
                me.setCenter(center);
            }

            if (captionList) {
                for (i = 0, ln = captionList.length; i < ln; i++) {
                    caption = captionList[i];

                    if (caption.getAlignTo() === 'series') {
                        caption.alignRect(mainRect);
                    }

                    caption.performLayout();
                }
            }

            me.redraw();
        }
        finally {
            me.resumeAnimation();

            if (applyThickness) {
                me.resumeThicknessChanged();
            }

            me.chartLayoutCount--;
            me.checkLayoutEnd();
        }
    },

    refloatAxes: function() {
        var me = this,
            axes = me.getAxes(),
            mainRect = me.getMainRect(),
            floating, value, alongAxis,
            i, n, axis, radius;

        if (!mainRect) {
            return;
        }

        radius = 0.5 * Math.min(mainRect[2], mainRect[3]);

        for (i = 0, n = axes.length; i < n; i++) {
            axis = axes[i];
            floating = axis.getFloating();
            value = floating ? floating.value : null;

            if (value !== null) {
                alongAxis = me.getAxis(floating.alongAxis);

                if (axis.getPosition() === 'angular') {
                    if (alongAxis) {
                        value = alongAxis.getLength() * value / alongAxis.getRange()[1];
                    }
                    else {
                        value = 0.01 * value * radius;
                    }

                    axis.sprites[0].setAttributes({ length: value }, true);
                }
                else {
                    if (alongAxis) {
                        if (Ext.isString(value)) {
                            value = alongAxis.getCoordFor(value);
                        }

                        value = value / (alongAxis.getRange()[1] + 1) * Math.PI * 2 -
                                Math.PI * 1.5 + axis.getRotation();
                    }
                    else {
                        value = Ext.draw.Draw.rad(value);
                    }

                    axis.sprites[0].setAttributes({ baseRotation: value }, true);
                }
            }
        }
    },

    redraw: function() {
        var me = this,
            axes = me.getAxes(),
            axis,
            seriesList = me.getSeries(),
            series,
            i, ln;

        for (i = 0, ln = axes.length; i < ln; i++) {
            axis = axes[i];
            axis.getSprites();
        }

        for (i = 0, ln = seriesList.length; i < ln; i++) {
            series = seriesList[i];
            series.getSprites();
        }

        me.renderFrame();
        me.callParent();
    },

    renderFrame: function() {
        this.refloatAxes();
        this.callParent();
    }
});
