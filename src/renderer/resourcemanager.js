(function(){
    "use strict";

    var c_cachedDocuments = {};
    var c_factories = {};
    var c_cachedAdapterHandles = {};

    XML3D.registerFactory = function(minetype, factory) {
        if(!c_factories[minetype])
            c_factories[minetype] = [];
        c_factories[minetype].push(factory);
    };


    function ResourceManager(){
    }

    function loadDocument(uri){
        console.log("Start request: " + this.uri);
        var xmlHttp = null;
        try {
            xmlHttp = new XMLHttpRequest();
        } catch(e) {
            xmlHttp  = null;
        }
        var that = this;
        if (xmlHttp) {
            xmlHttp._uri = uri;
            xmlHttp.open('GET', this.uri, true);
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4) {
                    processResponse(xmlHttp);
                }
            };
            xmlHttp.send(null);
        }
    };


    function processResponse(req){
        var mimetype = req.getResponseHeader("content-type");
        updateAdapterHandles(req, req._uri, mimetype);
    };

    function updateAdapterHandles(req, uri, mimetype)
    {
        var docCache = c_cachedDocuments[uri];
        docCache.mimetype = mimetype;

        if(mimetype == "application/json"){
            docCache.response = JSON.parse(req.responseText);
        }
        else if(mimetype == "application/xml" || mimetype == "text/xml"){
            docCache.response = req.responseXML;
        }

        var fragments = docCache.fragments;
        docCache.fragments = [];
        for(var i = 0; i < fragments.length; ++i){
            updateAdapterHandlesForFragment(uri, fragments[i]);
        }
    }

    function updateAdapterHandlesForFragment(uri, fragment){

        var response = c_cachedDocuments[uri].response;
        var mimetype = c_cachedDocuments[uri].mimetype;

        var fullUri = uri + "#" + fragment;
        var data = null;
        if(mimetype == "application/json"){
            data = response;
        }
        else if(mimetype == "application/xml" || mimetype == "text/xml"){
            data = response;
        }

        if(data){
            for(var adapterType in c_cachedAdapterHandles[fullUri]){
                var handle = c_cachedAdapterHandles[fullUri][adapterType];
                if(!handle.getRealAdapter() && c_factories[mimetype])
                {
                    for(var i = 0; i < c_factories[mimetype].length; ++i){
                        var fac = c_factories[mimetype][i];
                        if (fac.isFactoryFor(adapterType)) {
                            var a = fac.createAdapter(data);
                            if (a) {
                                handle.setRealAdapter(a);
                            }
                        }
                    }
                }
            }
        }
    }

    ResourceManager.prototype.getExternalAdapter = function(uri, type){

        if(!c_cachedAdapterHandles[uri])
            c_cachedAdapterHandles[uri] = {};

        var a = c_cachedAdapterHandles[uri][type];
        if (a)
            return a;

        var a = new XML3D.data.ProxyAdapter();
        c_cachedAdapterHandles[uri][type] = a;

        var docURI = uri.toStringWithoutFragment();
        var docData = c_cachedDocuments[docURI] || {};
        if(docData.response){
            updateAdapterHandlesForFragment(docURI, uri.fragment);
        }else{
            if(!docData.fragments) docData.fragments = [];
            docData.fragments.push(uri.fragment);
        }
        c_cachedDocuments[docURI] = docData;

        return a;
    }

})();