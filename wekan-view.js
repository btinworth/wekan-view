Cards = new Mongo.Collection('cards');

if (Meteor.isClient) {
  Meteor.subscribe('cards');
  Session.setDefault('displayType', 'Week');
  Session.setDefault('showDetails', false);

  Template.displaySettings.events = {
    'change #displayType': function (evt) {
      Session.set('displayType', evt.currentTarget.value);
    },
    'change #showDetails': function (evt) {
      Session.set('showDetails', evt.currentTarget.checked);
    },
  };

  Template.displaySettings.helpers({
    options: function () {
      return [
        { value: "Week",  label: "This Week"  },
        { value: "All",   label: "Everything" },
      ];
    },
  });

  Template.dateSummary.helpers({
    commits: function (date) {
      var ids = [];
      var cards = Cards.find({ $and: [
        { 'commits':  { $exists: true }},
        { 'dueAt':    { $exists: true }}
      ]});

      cards.forEach(function (card) {
        if (card.hasOwnProperty('dueAt') && date == moment(card.dueAt).format('dddd (LL)')) {
          if (!card.archived) {
            var cardStr = "";
            for (var i = 0; i < card.commits.length; ++i) {
              cardStr += card.commits[i];
              if (i < card.commits.length - 1) {
                cardStr += ", ";
              }
            }
            if (Session.get('showDetails') === true) {
              cardStr += ": " + card.title;
            }
            ids.push(cardStr);
        }
        }
      });

      if (!ids.length)
        ids.push('None');

      return ids;
    },

    dates: function () {
      var dates = [];

      if (Session.get('displayType') == 'Week') {
        for (var i = 0; i < 7; ++i) {
          var curr = new Date();
          var first = curr.getDate() - curr.getDay();
          var thisDay = new Date(curr.setDate(first + i)).toUTCString();
          dates.push(moment(thisDay).format('dddd (LL)'));
        }

        return dates;

      } else {

        var cards = Cards.find({ $and: [
          { 'commits':  { $exists: true }},
          { 'dueAt':    { $exists: true }}
        ]});

        var firstDay, lastDay;
        cards.forEach(function (card) {
          if (card.hasOwnProperty('dueAt')) {
            var cardMoment = moment(card.dueAt);
            var momentStr = cardMoment.format('YYYY MM DD');
            if (dates.indexOf(momentStr) == -1) {
              dates.push(momentStr);
            }
          }
        });

        dates.sort();

        for (var j = 0; j < dates.length; ++j) {
          dates[j] = moment(dates[j], 'YYYY MM DD').format('dddd (LL)');
        }

        if (!dates.length)
          dates.push('None');

        return dates;
      }
    },
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
