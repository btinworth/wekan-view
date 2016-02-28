Cards = new Mongo.Collection('cards');

if (Meteor.isClient) {
  Meteor.subscribe('cards');

  Session.setDefault('dates', '');
  Template.hello.helpers({
    commits: function (date) {
      var ids = [];
      var cards = Cards.find({ $and: [
        { 'commits': { $exists: true }},
        {'dueAt': { $exists: true }}
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
        { 'commits': { $exists: true }},
        {'dueAt': { $exists: true }}
      ]});
      cards.forEach(function (card) {
        if (card.hasOwnProperty('dueAt')) {
          dates.push(moment(card.dueAt).format('YYYY MM DD'));
        }
      });
      dates.sort();
      for (var i = 0; i < dates.length; ++i) {
        dates[i] = moment(dates[i]).format('dddd (LL)');
      }
      return dates;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
