Cards = new Mongo.Collection('cards');

if (Meteor.isClient) {
  Meteor.subscribe('cards');

  Session.setDefault('dates', '');
  Template.datesummary.helpers({
    commits: function (date) {
      var ids = [];
      var cards = Cards.find({ $and: [
        { 'commits':  { $exists: true }},
        { 'dueAt':    { $exists: true }}
      ]});

      cards.forEach(function (card) {
        if (card.hasOwnProperty('dueAt') && date == moment(card.dueAt).format('dddd (LL)')) {
          for (var i = 0; i < card.commits.length; ++i) {
            ids.push(card.commits[i]);
          }
        }
      });

      return ids;
    },

    dates: function () {
      var dates = [];
      var cards = Cards.find({ $and: [
        { 'commits':  { $exists: true }},
        { 'dueAt':    { $exists: true }}
      ]});
debugger;

      var firstDay, lastDay;
      if (Meteor.settings.public.dateRange) {
        var curr = new Date();
        var first = curr.getDate() - curr.getDay();
        var last = curr.getDate() - curr.getDay() + Meteor.settings.public.dateRange - 1;
        firstDay = new Date(curr.setDate(first)).toUTCString();
        lastDay = new Date(curr.setDate(last)).toUTCString();
      }
      cards.forEach(function (card) {
        if (card.hasOwnProperty('dueAt')) {
          var cardMoment = moment(card.dueAt);
          if (Meteor.settings.public.hasOwnProperty("dateRange")) {
            if (cardMoment.isAfter(firstDay) && cardMoment.isBefore(lastDay)) {
              dates.push(cardMoment.format('YYYY MM DD'));
            }
          } else {
            dates.push(cardMoment.format('YYYY MM DD'));
          }
        }
      });
      dates.sort();

      for (var i = 0; i < dates.length; ++i) {
        dates[i] = moment(dates[i], 'YYYY MM DD').format('dddd (LL)');
      }

      if (!dates.length)
        dates.push('None');

      return dates;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
