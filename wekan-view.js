Cards = new Mongo.Collection('cards');
CardComments = new Mongo.Collection('card_comments');

if (Meteor.isClient) {
  Meteor.subscribe('cards');

  Session.setDefault('groupBy',       'date'  );
  Session.setDefault('displayType',   'Week'  );
  Session.setDefault('showTitles',   false   );

  Template.info.events = {
    'change #groupBy': function (evt) {
      Session.set('groupBy', evt.currentTarget.value);
    },
  };
  Template.info.helpers({
    groupByDate: function() {
      return Session.get('groupBy') == 'date';
    },
    groupByUser: function() {
      return Session.get('groupBy') == 'user';
    },
    groupByOptions: function() {
      return [
        { value: "date",  label: "Date" },
        { value: "user",  label: "User" },
      ];
    },
  });

  Template.displaySettings.events = {
    'change #displayType': function (evt) {
      Session.set('displayType', evt.currentTarget.value);
    },
    'change #showTitles': function (evt) {
      Session.set('showTitles', evt.currentTarget.checked);
    },
  };

  Template.displaySettings.helpers({
    displayTypeOptions: function () {
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
            if (Session.get('showTitles') === true) {
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

  Template.userSummary.helpers({
    users: function() {
      var ids = [];
      var cards = Cards.find({});
      cards.forEach(function (card) {
        for (var i = 0; i < card.members.length; ++i) {
          var memberId = card.members[i];
          var account = Accounts.users.findOne({ _id: memberId }).username;
          if (ids.indexOf(account) == -1) {
            ids.push(account);
          }
        }
      });
      ids.sort();
      return ids;
    },
    cards: function(user) {
      var c = [];
      var userId = Accounts.users.findOne({ username: user })._id;
      var cards = Cards.find({ members: { $in: [ userId ] } });
      cards.forEach(function (card) {
        var obj = {
          title:        card.title,
          issues:       card.issues,
          commits:      card.commits,
          description:  card.description,
          comments:     [],
        };
        var comments = CardComments.find({ cardId: card._id });
        comments.forEach(function (comment) {
          var user = Accounts.users.findOne({ _id: comment.userId }).username;
          obj.comments.push(user + ': ' + comment.text);
        });
        c.push(obj);
      });
      return c;
    },
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
