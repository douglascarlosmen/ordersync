/** global Ext, MockAjaxManager, expect, jasmine, spyOn, xit */

topSuite('Ext.grid.filters.Plugin', [
    'Ext.grid.Grid',
    'Ext.data.virtual.Store',
    'Ext.grid.filters.*'
], function() {
    var MyStore = Ext.define(null, {
        extend: 'Ext.data.Store',

        load: function() {
            var ret = this.callParent(arguments);

            // this.flushLoad();

            return ret;
        }
    }),
        store, grid, plugin, provider, colMap, oldProvider;

    function getData() {
        return [
            { name: 'Lisa', email: 'lisa@simpsons.com', phone: '555-111-1224', age: 14, visible: true },
            { name: 'Bart', email: 'bart@simpsons.com', phone: '555-222-1234', age: 12, visible: false },
            { name: 'Homer', email: 'homer@simpsons.com', phone: '555-222-1244', age: 44, visible: true },
            { name: 'Marge', email: 'marge@simpsons.com', phone: '555-222-1254', age: 41, visible: false }
        ];
    }

    function makeStore(storeCfg) {
        return store = new MyStore(Ext.apply({
            autoDestroy: true,
            fields: ['name', 'email', 'phone', 'age', 'visible'],
            data: getData()
        }, storeCfg));
    }

    function makeGrid(gridCfg) {
        grid = Ext.merge({
            columns: [
                { header: 'Name', dataIndex: 'name', editor: 'textfield' },
                {
                    header: 'Email', dataIndex: 'email', flex: 1,
                    editor: {
                        xtype: 'textfield',
                        allowBlank: false
                    }
                },
                { header: 'Phone', dataIndex: 'phone', editor: 'textfield' },
                { header: 'Age', dataIndex: 'age', editor: 'textfield', filter: 'number' },
                { header: 'Visible', dataIndex: 'visible', editor: 'textfield', filter: 'boolean' }
            ],
            selectable: {
                checkbox: true,
                rows: true
            },
            plugins: {
                gridfilters: true
            },
            width: 400,
            height: 400,
            renderTo: Ext.getBody(),
            stateful: true,
            stateId: 'fgrid'
        }, gridCfg);

        if (!grid.store) {
            grid.store = makeStore();
        }

        grid = new Ext.grid.Grid(grid);
        plugin = grid.findPlugin('gridfilters');
        setColMap();
    }

    function tearDown() {
        if (provider) {
            provider.destroy();
        }

        Ext.state.Provider.register(oldProvider || new Ext.state.Provider());
        provider = store = grid = plugin = Ext.destroy(grid);
    }

    function expectState(expected) {
        var actual = getState();

        expect(actual).toEqual(expected);
    }

    function getState() {
        provider.flushSaveState();

        expect(provider.isSaveStatePending).toBe(false);

        return provider.state;
    }

    function getCells(col) {
        var cells = [];

        store.each(function(rec) {
            var row = grid.getItem(rec);

            // Skip group headers/footers
            if (row.isGridRow) {
                cells.push(row.getCellByColumn(col));
            }
        });

        return cells;
    }

    function setColMap() {
        colMap = {};
        grid.query('column').forEach(function(col) {
            colMap[col.getDataIndex()] = col;
        });
    }

    beforeEach(function() {
        MockAjaxManager.addMethods();
        oldProvider = Ext.state.Provider.get();
        provider = new Ext.state.Provider();
        Ext.state.Provider.register(provider);
    });

    afterEach(function() {
        tearDown();
        MockAjaxManager.removeMethods();
    });

    describe('stateful filter', function() {
        it('should save the current filter to stateful storage', function() {
            makeGrid();

            expect(provider.isSaveStatePending).toBeFalsy();

            plugin.setActiveFilter([{
                property: 'name',
                operator: 'like',
                value: 'ar'
            }]);

            expect(provider.isSaveStatePending).toBe(true);

            expectState({
                fgrid: {
                    plugins: {
                        gridfilters: {
                            $: {
                                activeFilter: [{
                                    property: 'name',
                                    operator: 'like',
                                    value: 'ar'
                                }]
                            }
                        }
                    }
                }
            });
        });

        it('should restore the active filter from stateful storage', function() {
            var activeFilter, filters;

            provider.set({
                fgrid: {
                    plugins: {
                        gridfilters: {
                            $: {
                                activeFilter: [{
                                    property: 'name',
                                    operator: 'like',
                                    value: 'ar'
                                }]
                            }
                        }
                    }
                }
            });

            makeGrid();

            expect(provider.isSaveStatePending).toBeFalsy();

            activeFilter = plugin.getActiveFilter();

            expect(activeFilter).toEqual([{
                property: 'name',
                operator: 'like',
                value: 'ar'
            }]);

            filters = store.getFilters();

            expect(filters.length).toEqual(1);
        });

        /** TODO False positive test */
        xit('should send the correct filters coming from stateful storage', function() {
            var data, operation, filters, proxySpy, requests;

            provider.set({
                fgrid: {
                    plugins: {
                        gridfilters: {
                            $: {
                                activeFilter: [{
                                    property: 'name',
                                    operator: 'like',
                                    value: 'ar'
                                }, {
                                    property: 'email',
                                    operator: 'like',
                                    value: 'simpsons.com'
                                }]
                            }
                        }
                    }
                }
            });

            // Object.defineProperty(MyStore.prototype, 'loadCount', {
            //     get() {
            //         return this.__lc;
            //     },
            //
            //     set(v) {
            //         debugger;
            //         this.__lc = v;
            //     }
            // });

            makeGrid({
                store: makeStore({
                    data: null,
                    remoteFilter: true,
                    autoLoad: true,
                    proxy: {
                        type: 'ajax',
                        url: 'foo',
                        reader: {
                            type: 'json',
                            successProperty: 'success',
                            rootProperty: 'data'
                        }
                    }
                })
            });

            proxySpy = spyOn(store.getProxy(), 'read').andCallThrough();
            requests = Ext.Ajax.mockGetAllRequests();

            // Upon creation the grid's store will have a delayed/pending load for the
            // server. It should not have been sent so the mock ajax layer won't have
            // seen it yet.
            expect(requests.length).toBe(0);
            expect(store.loadCount).toBeFalsy();
            expect(proxySpy.calls.length).toEqual(0);
            expect(store.hasPendingLoad()).toBe(true);

            store.flushLoad();

            requests = Ext.Ajax.mockGetAllRequests();

            // Now that we've flushed the store's request, the mock ajax layer has it,
            // but the store is still in a load pending state.
            expect(requests.length).toBe(1);
            expect(proxySpy.calls.length).toEqual(1);
            expect(store.loadCount).toBeFalsy();
            expect(store.hasPendingLoad()).toBe(true);

            // Satisfy the request:
            data = getData();
            Ext.Ajax.mockCompleteWithData({
                success: true,
                data: [data[1], data[3]]  // Bart and Marge match "like 'ar'"
            });

            // BUG - Store increments loadCount twice (once in onCollectionAdd and the
            // other in loadRecords), so don't be too picky until that is fixed:
            expect(store.loadCount).toBeGE(1);

            // The store should have the data now:
            expect(store.hasPendingLoad()).toBe(false);

            // Check on what was actually serialized into the parameters:
            filters = Ext.JSON.decode(requests[0].params.filter);

            expect(filters).toEqual([{
                property: 'name',
                operator: 'like',
                value: 'ar'
            }, {
                property: 'email',
                operator: 'like',
                value: 'simpsons.com'
            }]);
        });

        it('should not set the filter', function() {
            makeGrid({
                plugins: {
                    gridfilters: false
                }
            });

            var fs = plugin;

            expect(fs).toBe(null);
        });

        it('should set initial activeFilter value to be null', function() {
            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });
            expect(plugin.getActiveFilter()).toBe(null);
        });

        it('should set initial activeFilter value to be something', function() {
            var a = [{ operator: "like", property: "name", value: "Marge" }];

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            expect(plugin.getActiveFilter()).toBe(null);

            plugin.setActiveFilter(a);
            expect(plugin.getActiveFilter()).not.toBe(null);
        });

        it('should set initial activeFilter and check string filter applied', function() {
            var a = [{ operator: "like", property: "name", value: "Marge" }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.name);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe('Lisa');

            // To set filter type string
            plugin.setActiveFilter(a);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe('Marge');
            });
        });

        it('should set initial activeFilter and check number filter applied for op <', function() {
            var a_lt = [{ operator: "<", property: "age", value: 14 }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.age);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(14);

            // To set filter type number with < oprator
            plugin.setActiveFilter(a_lt);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(12);
                plugin.setActiveFilter(null);
            });
        });

        it('should set initial activeFilter and check number filter applied for op >', function() {
            var a_gt = [{ operator: ">", property: "age", value: 41 }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.age);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(14);

            // To set filter type number with > oprator
            plugin.setActiveFilter(a_gt);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(44);
            });
        });

        it('should set initial activeFilter and check number filter applied for op =', function() {
            var a_eq = [{ operator: "=", property: "age", value: 44 }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.age);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(14);

            // To set filter type number with = oprator
            plugin.setActiveFilter(a_eq);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(44);
            });
        });

        it('should set initial activeFilter and check number filter applied for op < and >', function() {
            var a_lt_gt = [
                { operator: "<", property: "age", value: 44 },
                { operator: ">", property: "age", value: 14 }
            ],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.age);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(14);

            // To set filter type number with < and > oprator
            plugin.setActiveFilter(a_lt_gt);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(41);
                plugin.setActiveFilter(null);
            });
        });

        it('should set initial activeFilter and check boolean filter applied for op true', function() {
            var a_true = [{ operator: "==", property: "visible", value: true }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.visible);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(true);
            expect(cells[1].getValue()).toBe(false);

            // To set filter type boolean
            plugin.setActiveFilter(a_true);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(true);
                expect(cells[1].getValue()).toBe(true);
            });
        });

        it('should set initial activeFilter and check boolean filter applied for op false', function() {
            var a_false = [{ operator: "==", property: "visible", value: false }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.visible);

            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe(true);
            expect(cells[1].getValue()).toBe(false);

            // To set filter type boolean
            plugin.setActiveFilter(a_false);

            // To check there are activeFilter exists
            expect(plugin.getActiveFilter()).not.toBe(null);

            waits(100);

            runs(function() {
                // To check value after filter applied
                expect(cells[0].getValue()).toBe(false);
                expect(cells[1].getValue()).toBe(false);
            });
        });

        it('should remove activeFilter and check filter removed', function() {
            var a = [{ operator: "like", property: "name", value: "Marge" }],
                cells;

            makeGrid({
                plugins: {
                    gridfilters: true
                }
            });

            cells = getCells(colMap.name);

            // To check there are no activeFilter
            expect(plugin.getActiveFilter()).toBe(null);

            // To check initial value
            expect(cells[0].getValue()).toBe('Lisa');

            // To set filter type string
            plugin.setActiveFilter(a);

            waits(100);

            runs(function() {
                // To check there are activeFilter exists
                expect(plugin.getActiveFilter()).not.toBe(null);

                // To check value after filter applied
                expect(cells[0].getValue()).toBe('Marge');

                // To remove applied filter
                plugin.setActiveFilter(null);

                // To check there are no activeFilter
                expect(plugin.getActiveFilter()).toBe(null);

                waits(100);

                runs(function() {
                    // To check initial value
                    expect(cells[0].getValue()).toBe('Lisa');
                });
            });
        });
    });

    describe('Virtual Store', function() {

        function createStore(cfg) {
            return store = new Ext.data.virtual.Store(Ext.apply({
                proxy: {
                    type: 'ajax',
                    url: 'fakeUrl',
                    reader: {
                        rootProperty: 'data',
                        totalProperty: 'totalCount'
                    }
                },
                pageSize: 25,
                autoLoad: true
            }, cfg));
        }

        function createGrid(cfg) {
            cfg = Ext.apply({
                title: 'Virtual Store Grid',
                height: 400,
                width: 600,
                plugins: {
                    gridfilters: true
                },
                columns: [{
                    text: 'column Header 1'
                }, {
                    text: 'Column Header 2'
                }],
                store: createStore(),
                renderTo: document.body
            });
            grid = new Ext.grid.Grid(cfg);
        }

        afterEach(function() {
            store.destroy();
            store = null;
        });

        it('should not throw error on adding filter plugin to the grid with virtual store', function() {
            expect(function() {
                createGrid();
            }).not.toThrow();
        });
    });

    describe('inital filter in grid configuration', function() {
        it('should send the correct filters with default operator for given type', function() {
            var filters;

            makeGrid({
                columns: [
                    { header: 'Name', dataIndex: 'name', editor: 'textfield' },
                    {
                        header: 'Email', dataIndex: 'email', flex: 1,
                        filter: {
                            value: 'ar'
                        }
                    },
                    { header: 'Phone', dataIndex: 'phone', editor: 'textfield' },
                    {
                        header: 'Age', dataIndex: 'age', editor: 'textfield',
                        filter: {
                            type: 'number',
                            value: '12'
                        }
                    },
                    { header: 'Visible', dataIndex: 'visible', editor: 'textfield', filter: 'boolean' }
                ],
                store: makeStore({
                    data: null,
                    remoteFilter: true,
                    proxy: {
                        type: 'ajax',
                        url: 'foo',
                        reader: {
                            type: 'json',
                            successProperty: 'success',
                            rootProperty: 'data'
                        }
                    },
                    autoLoad: true,
                    listeners: {
                        filterchange: function(store, request) {
                            filters = request;
                        }
                    }
                })
            });

            waits(300);
            runs(function() {
                expect(filters[0].serialize()).toEqual([
                    {
                        "property": "email",
                        "operator": "like",
                        "value": "ar"
                    },
                    {
                        "property": "age",
                        "operator": "==",
                        "value": 12
                    }
                ]);
            });
        });
    });

    describe('Filter Special characters', function() {

        function createStore(cfg) {
            return store = Ext.create('Ext.data.Store', {
                fields: ['name', 'email', 'phone'],
                data: [{
                    'name': 'Dea/?nna',
                    "email": "lisa@simpsons.com",
                    "phone": "555-111-1224"
                }, {
                    'name': 'Ba/rt',
                    "email": "bart@simpsons.com",
                    "phone": "555-222-1234"
                }, {
                    'name': 'Ho\//mer',
                    "email": "home@simpsons.com",
                    "phone": "555-222-1244"
                }, {
                    'name': 'Marge',
                    "email": "marge@simpsons.com",
                    "phone": "555-222-1254"
                }]
            });
        }

        function createGrid(cfg) {
            cfg = Ext.apply({
                title: 'Grid Filters',
                height: 400,
                width: 600,
                plugins: {
                    gridfilters: true
                },
                columns: [{
                    text: 'Name',
                    dataIndex: 'name',
                    flex: 1
                }, {
                    text: 'Email',
                    dataIndex: 'email',
                    flex: 1
                }, {
                    text: 'Phone',
                    dataIndex: 'phone',
                    flex: 1
                }],
                store: createStore(),
                renderTo: document.body
            });
            grid = new Ext.grid.Grid(cfg);
        }

        afterEach(function() {
            store.destroy();
            store = null;
        });

        it('should filter for special characters ', function() {
            var changeSpy = jasmine.createSpy('filter field change'),
                store, headerContainer, filterField, filterMenu;

            expect(function() {
                createGrid();
            }).not.toThrow();

            store = grid.getStore();
            headerContainer = grid.getHeaderContainer();
            headerContainer.innerItems[0].showMenu();
            filterMenu = headerContainer.innerItems[0].getMenu().down('[_itemId=filter]').getMenu();
            filterField = filterMenu.down();
            store.on({
                refresh: changeSpy
            });
            filterField.setValue('/');
            waitForSpy(changeSpy);

            runs(function() {
                expect(grid.getStore().getCount()).toBe(3);
            });
        });
    });

    describe("column cls decoration", function() {
        var filterCls = Ext.grid.filters.Plugin.prototype.filterCls,
            cols;

        afterEach(function() {
            cols = null;
        });

        describe("works for both non-nested and nested columns", function() {
            it("should add the cls for columns when setting a value", function() {
                var filterChangeSpy = jasmine.createSpy('filter change spy'),
                    col;

                makeGrid(null, {
                    columns: [{
                        dataIndex: 'name',
                        filter: true
                    }, {
                        columns: [{
                            dataIndex: 'age',
                            filter: {
                                type: 'number'
                            }
                        }]
                    }]
                });

                store.on('filterchange', filterChangeSpy);
                cols = grid.getColumns();
                col = cols.filter(function(col) {
                    return col.getDataIndex() === 'name';
                })[0];

                expect(col.el).not.toHaveCls(filterCls);

                colMap.name.showMenu();
                var menu = colMap.name.getMenu(),
                    filter = menu.getComponent('filter');

                expect(filter.getChecked()).toBeFalsy();

                waitForSpy(filterChangeSpy);
                filter.getMenu().show();
                filter.getMenu().down('textfield').setValue('ar');
                filter.getMenu().hide();

                runs(function() {
                    expect(filter.getChecked()).toBe(true);
                    expect(col.el).toHaveCls(filterCls);
                });
            });

            it("should remove the cls for columns when clearing a value", function() {
                var filterChangeSpy = jasmine.createSpy('filter change spy'),
                    col;

                makeGrid(null, {
                    columns: [{
                        dataIndex: 'name',
                        filter: true
                    }, {
                        columns: [{
                            dataIndex: 'age',
                            filter: {
                                type: 'number'
                            }
                        }]
                    }]
                });

                store.on('filterchange', filterChangeSpy);
                cols = grid.getColumns();
                col = cols.filter(function(col) {
                    return col.getDataIndex() === 'name';
                })[0];

                expect(col.el).not.toHaveCls(filterCls);

                colMap.name.showMenu();
                var menu = colMap.name.getMenu(),
                    filter = menu.getComponent('filter');

                expect(filter.getChecked()).toBeFalsy();

                waitForSpy(filterChangeSpy);
                filter.getMenu().show();
                filter.getMenu().down('textfield').setValue('ar');
                filter.getMenu().hide();

                runs(function() {
                    expect(filter.getChecked()).toBe(true);
                    expect(col.el).toHaveCls(filterCls);

                    filterChangeSpy.reset();
                    waitForSpy(filterChangeSpy);
                    filter.getMenu().show();
                    filter.getMenu().down('textfield').setValue('');
                    filter.getMenu().hide();

                    runs(function() {
                        expect(filter.getChecked()).toBe(false);
                        expect(col.el).not.toHaveCls(filterCls);
                    });
                });
            });

            it("should remove the cls for columns when unchecking the filter menu item", function() {
                var filterChangeSpy = jasmine.createSpy('filter change spy'),
                    col;

                makeGrid(null, {
                    columns: [{
                        dataIndex: 'name',
                        filter: true
                    }, {
                        columns: [{
                            dataIndex: 'age',
                            filter: {
                                type: 'number'
                            }
                        }]
                    }]
                });

                store.on('filterchange', filterChangeSpy);
                cols = grid.getColumns();
                col = cols.filter(function(col) {
                    return col.getDataIndex() === 'name';
                })[0];

                expect(col.el).not.toHaveCls(filterCls);

                colMap.name.showMenu();
                var menu = colMap.name.getMenu(),
                    filter = menu.getComponent('filter');

                expect(filter.getChecked()).toBeFalsy();

                waitForSpy(filterChangeSpy);
                filter.getMenu().show();
                filter.getMenu().down('textfield').setValue('ar');
                filter.getMenu().hide();

                runs(function() {
                    expect(filter.getChecked()).toBe(true);
                    expect(col.el).toHaveCls(filterCls);

                    filterChangeSpy.reset();
                    waitForSpy(filterChangeSpy);
                    filter.setChecked(false);

                    runs(function() {
                        expect(filter.getChecked()).toBe(false);
                        expect(col.el).not.toHaveCls(filterCls);
                    });
                });

            });
        });
    });
});
