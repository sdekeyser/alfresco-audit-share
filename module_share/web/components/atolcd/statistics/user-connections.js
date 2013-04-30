/*
 * Copyright (C) 2013 Atol Conseils et Développements.
 * http://www.atolcd.com/
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// AtolStatistics namespace
if (typeof AtolStatistics == undefined || !AtolStatistics) { var AtolStatistics = {}; }

/**
 * UserConnections tool component.
 *
 * @namespace AtolStatistics
 * @class AtolStatistics.UserConnections
 */
(function () {
  /**
   * YUI Library aliases
   */
  var Dom = YAHOO.util.Dom,
      Event = YAHOO.util.Event,
      dateFormat = Alfresco.thirdparty.dateFormat;

  /**
   * UserConnections constructor.
   *
   * @param {String} htmlId The HTML id of the parent element
   * @return {AtolStatistics.UserConnections} The new UserConnections instance
   * @constructor
   */
  AtolStatistics.UserConnections = function UserConnections_constructor(htmlId) {
    AtolStatistics.UserConnections.superclass.constructor.call(this, "AtolStatistics.UserConnections", htmlId, ["button", "container", "json"]);
    return this;
  };

  YAHOO.extend(AtolStatistics.UserConnections, AtolStatistics.Tool, {
    /**
     * @attribute recentlyConnectedDelay
     * Durée (en minutes) depuis laquelle on retrouve les utilisateurs récemments connectés
     */
    recentlyConnectedDelay: 30,

    /**
     * @attribute headers
     * Contient les éléments Dom des différents headers de la table sous le graphe
     */
    headers: [],

    /**
     * Fired by YUI when parent element is available for scripting.
     * Component initialisation, including instantiation of YUI widgets and event listener binding.
     *
     * @method onReady
     */
    onReady: function UserConnections_onReady() {
      AtolStatistics.UserConnections.superclass.onReady.call(this);

      var me = this;

      // Chart type button
      this.widgets.chartTypeCriteriaButton = new YAHOO.widget.Button(this.id + "-chart-type-criteria", {
        type: "split",
        menu: this.id + "-chart-type-criteria-select",
        lazyloadmenu: false
      });

      var onChartTypeMenuItemClick = function (p_sType, p_aArgs, p_oItem) {
        var sText = p_aArgs[1].cfg.getProperty("text"),
            value = p_aArgs[1].value;

        me.widgets.chartTypeCriteriaButton.value = value;
        me.widgets.chartTypeCriteriaButton.set("label", sText);
        me.execute();
      };
      this.widgets.chartTypeCriteriaButton.getMenu().subscribe("click", onChartTypeMenuItemClick);


      this.headers["users-connected"] = Dom.get(this.id + "-users-connected-header");
      this.headers["users-never-connected"] = Dom.get(this.id + "-users-never-connected-header");
      this.headers["users-recently-connected"] = Dom.get(this.id + "-users-recently-connected-header");

      this.loadSites();
    },

    onCSVExport: function UserConnections_onCSVExport() {
      if (this.lastRequest.params) {
        var params = this.lastRequest.params;
        params += "&type=users";
        params += "&values=" + this.lastRequest.values.toString();
        params += "&interval=" + this.lastRequest.dateFilter;
        var url = Alfresco.constants.PROXY_URI + "share-stats/export-audits" + params; // ?json=" + escape(YAHOO.lang.JSON.stringify(this.lastRequest.data));//JSON.stringify
        window.open(url);
      }
    },

    /**
     * @method prepareRecentlyConnectedUsersRequest
     */
    prepareRecentlyConnectedUsersRequest: function UserConnections_prepareRecentlyConnectedUsersRequest() {
      // Récupération des variables de l'UI
      var site = this.convertMenuValue(this.widgets.siteButton.value),
          currentDate = new Date(),
          params = "";

      params = "?type=users-recently-connected";
      params += "&to=" + currentDate.getTime();
      params += "&from=" + currentDate.setMinutes(currentDate.getMinutes() - this.recentlyConnectedDelay);
      if (site) {
        if (site.indexOf(',') >= 0) {
          params += "&sites=" + site;
        } else {
          params += "&site=" + site;
        }
      }

      this.executeUserRequest(params, "users-recently-connected");
    },

    /**
     * @method prepareUserRequest
     */
    prepareUserRequest: function UserConnections_prepareUserRequest(type) {
      // Récupération des variables de l'UI
      var dateFilter = this.options.currentDateFilter,
        site = this.convertMenuValue(this.widgets.siteButton.value),
        params = "";

      // Création du tableau d'intervalle de dates
      tsArray = this.buildTimeStampArray();
      params = "?type=" + type;
      params += "&from=" + tsArray[0];
      params += "&to=" + tsArray[tsArray.length - 1];
      if (site) {
        if (site.indexOf(',') >= 0) {
          params += "&sites=" + site;
        } else {
          params += "&site=" + site;
        }
      }

      this.executeUserRequest(params, type);
    },

    /**
     * @method executeUserRequest
     */
    executeUserRequest: function UserConnections_executeUserRequest(params, type) {
      var displayUsers = function (response) {
        var users = response.json.items,
            el = Dom.get(this.id + "-" + type);

        if (users && users.length) {
          var context = Alfresco.constants.URL_PAGECONTEXT,
              html = "";

          for (var i=0, ii=users.length ; i<ii ; i++) {
            var user = users[i];
            html += '<li class="nav-user">';
            html += '<a class="theme-color-1" tabindex="0" target="_blank" href="' + context + 'user/' + user.username + '/profile">' + user.fullName + ' (' + user.username + ')</a>';
            html += '</li>';
          }

          html = "<ul>" + html + "</ul>";
          el.innerHTML = html;
        } else {
          el.innerHTML = this.msg("label.no-results." + type);
        }

        this.headers[type].innerHTML += " (" + users.length + ")";
      };

      var url = Alfresco.constants.PROXY_URI + "share-stats/select-users" + params;
      Alfresco.util.Ajax.jsonGet({
        url: url,
        successCallback: {
          fn: displayUsers,
          scope: this
        },
        failureMessage: this.msg("label.popup.query.error"),
        execScripts: true
      });
    },

    onSearch: function UserConnections_onSearch() {
      // Récupération des variables de l'UI
      var dateFilter = this.options.currentDateFilter,
        site = this.convertMenuValue(this.widgets.siteButton.value),
        tsString = "",
        params = "";

      // Création du tableau d'intervalle de dates
      if (dateFilter) {
        var tsArray = this.buildTimeStampArray();
        //Mise à jour des labels
        this.updateUsersLabels(tsArray);
        tsString = tsArray.toString();
      }

      // Création des paramètres et exécution de la requête
      params = "?type=users-count";
      params += "&dates=" + tsString;
      if (site) {
        if (site.indexOf(',') >= 0) {
          params += "&sites=" + site;
        } else {
          params += "&site=" + site;
        }
      }
      this.lastRequest.params = params;
      this.lastRequest.dateFilter = dateFilter;

      var url = Alfresco.constants.PROXY_URI + "share-stats/select-users" + this.lastRequest.params;
      Alfresco.util.Ajax.jsonGet({
        url: url,
        successCallback: {
          fn: this.displayGraph,
          scope: this
        },
        failureMessage: this.msg("label.popup.query.error"),
        execScripts: true,
        additionalsParams: {
          chartType: this.widgets.chartTypeCriteriaButton.value || '',
          type: "count",
          site: site,
          siteTitle: this.sites[site] || '',
          tsString: tsString,
          target: "chart",
          height: "450",
          width: "90%",
          chartId: this.id + '-chart'
        }
      });

    },

    /**
     * @method displayGraph Affiche le requête suite à une requête Ajax
     * @param response Réponse de la requête
     */
    displayGraph: function UserConnections_displayGraph(response) {
      var additionalsParams, id, swf, chartTag;

      additionalsParams = response.config.additionalsParams;
      id = this.id + "-" + additionalsParams.target;
      swf = Dom.get(id);
      chartTag = swf.tagName.toLowerCase();

      if (response.json) {
        this.widgets.exportButton.set("disabled", false);
        response.json.currentFilter = this.options.currentDateFilter;
        response.json.additionalsParams = additionalsParams;
        this.lastRequest.values = response.json.values;

        if (chartTag == "embed" || chartTag == "object") {
          swf.load(getUserFlashData(escape(YAHOO.lang.JSON.stringify(response.json))));
        } else {
          // Création variables et attribut - GetFlashData défini dans get_data.js - id : Variables json pour ofc.
          var flashvars = {
            "get-data": "getUserFlashData",
            "id": escape(YAHOO.lang.JSON.stringify(response.json))
          },
            params = {
              wmode: "opaque"
            },
            // /!\ pour IE
            attributes = {
              salign: "l",
              AllowScriptAccess: "always"
            };

          // Création du graphique Flash.
          swfobject.embedSWF(this.options.pathToSwf, id, additionalsParams.width, additionalsParams.height, "9.0.0", "expressInstall.swf", flashvars, params, attributes);
        }

      } else {
        // On remove le SWF courant.
        this.removeGraph(id);
        Dom.get(id).innerHTML = this.msg("message.empty");
        this.widgets.exportButton.set("disabled", true);
      }
    },

    /**
     * @method buildParams Construit une chaîne de caractère pour passer les arguments en GET
     * @return string params argument à passer à la requête
     */
    buildParams: function UserConnections_buildParams() {
      // TODO:
      return "";
    },

    updateUsersLabels: function UserConnections_updateUsersLabels(tsArray) {
      var connectedLabel = "",
        neverConnectedLabel = "";

      switch (this.options.currentDateFilter) {
      case "days":
        var date = new Date(tsArray[0]),
            today = new Date();

        if (date.getMonth() == today.getMonth() && date.getDate() == today.getDate() && date.getFullYear() == today.getFullYear()) {
          connectedLabel = this.msg("label.users.connected.today");
          neverConnectedLabel = this.msg("label.users.never-connected.today");
        } else {
          var day = dateFormat(date, AtolStatistics.dateFormatMasks.mediumDay); // dddd dd/mm
          connectedLabel = this.msg("label.users.connected." + this.options.currentDateFilter, day);
          neverConnectedLabel = this.msg("label.users.never-connected." + this.options.currentDateFilter, day);
        }
        break;

      case "weeks":
        var from = dateFormat(new Date(tsArray[0]), AtolStatistics.dateFormatMasks.shortDate), // dd/mm/yyyy
            to   = dateFormat(new Date(tsArray[tsArray.length - 2]), AtolStatistics.dateFormatMasks.shortDate); // dd/mm/yyyy

        connectedLabel = this.msg("label.users.connected." + this.options.currentDateFilter, from, to);
        neverConnectedLabel = this.msg("label.users.never-connected." + this.options.currentDateFilter, from, to);
        break;

      case "months":
        var month = dateFormat(new Date(tsArray[0]), AtolStatistics.dateFormatMasks.monthYear); // mmmm yyyy
        connectedLabel = this.msg("label.users.connected." + this.options.currentDateFilter, month);
        neverConnectedLabel = this.msg("label.users.never-connected." + this.options.currentDateFilter, month);
        break;

      case "years":
        var date = new Date(tsArray[0]);
        connectedLabel = this.msg("label.users.connected." + this.options.currentDateFilter, date.getFullYear());
        neverConnectedLabel = this.msg("label.users.never-connected." + this.options.currentDateFilter, date.getFullYear());
        break;
      };

      if (connectedLabel) {
        this.headers["users-connected"].innerHTML = connectedLabel;
      }
      if (neverConnectedLabel) {
        this.headers["users-never-connected"].innerHTML = neverConnectedLabel;
      }
      this.headers["users-recently-connected"].innerHTML = this.msg("label.users.recently-connected");
    },

    execute: function UserConnections_execute() {
      this.prepareUserRequest("users-connected");
      this.prepareUserRequest("users-never-connected");
      this.prepareRecentlyConnectedUsersRequest();

      AtolStatistics.UserConnections.superclass.execute.call(this);
    }
  });
})();