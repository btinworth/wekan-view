Cards = new Mongo.Collection('cards');
CardComments = new Mongo.Collection('card_comments');
Lists = new Mongo.Collection('lists');

if (Meteor.isClient) {
  Meteor.subscribe('cards');

  Session.setDefault('groupBy',           'date'  );

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

  // Group by Date

  Session.setDefault('displayType',       'Week'  );
  Session.setDefault('showUsers',         false   );
  Session.setDefault('showTitles',        false   );

  Template.dateSettings.events = {
    'change #displayType': function (evt) {
      Session.set('displayType', evt.currentTarget.value);
    },
    'change #showUsers': function (evt) {
      Session.set('showUsers', evt.currentTarget.checked);
    },
    'change #showTitles': function (evt) {
      Session.set('showTitles', evt.currentTarget.checked);
    },
  };

  Template.dateSettings.helpers({
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
        { 'commits':  { $exists: true, $ne: [] }},
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
            if (Session.get('showUsers') === true) {
              var members = "";
              for (var j = 0; j < card.members.length; ++j) {
                members += Accounts.users.findOne({ _id: card.members[j] }).username;
                if (j < card.members.length - 1) {
                  members += ", ";
                }
              }
              if (members.length) {
                cardStr += " (" + members + ")";
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
          { 'commits':  { $exists: true, $ne: [] }},
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

  // Group by User

  Session.setDefault('showCommits',       true    );
  Session.setDefault('showIssues',        true    );
  Session.setDefault('showDescriptions',  true    );
  Session.setDefault('showComments',      true    );
  Session.setDefault('showDueDate',       true    );

  Template.userSettings.events = {
    'change #showCommits': function (evt) {
      Session.set('showCommits', evt.currentTarget.checked);
    },
    'change #showIssues': function (evt) {
      Session.set('showIssues', evt.currentTarget.checked);
    },
    'change #showDescriptions': function (evt) {
      Session.set('showDescriptions', evt.currentTarget.checked);
    },
    'change #showComments': function (evt) {
      Session.set('showComments', evt.currentTarget.checked);
    },
    'change #showDueDate': function (evt) {
      Session.set('showDueDate', evt.currentTarget.checked);
    },
  };

  Template.userSummary.helpers({
    users: function() {
      var ids = [];
      var cards = Cards.find({});
      cards.forEach(function (card) {
        for (var i = 0; i < card.members.length; ++i) {
          var memberId = card.members[i];
          var account = Accounts.users.findOne({ _id: memberId }).username;
          var exists = false;
          for (var j = 0; j < ids.length; ++j) {
            if (ids[j].user == account) {
              exists = true;
            }
          }
          if (!exists) {
            var userCards = Cards.find({ members: { $in: [ memberId ] }});
            var lists = [];
            userCards.forEach(function (userCard) {
              var listId = Lists.findOne({ _id: userCard.listId }).title;
              if (lists.indexOf(listId) == -1)
                lists.push(listId);
            });
            ids.push({
              'user': account,
              'lists': lists
            });
          }
        }
      });
      return ids;
    },
    cards: function(user, list) {
      var c = [];
      var userId = Accounts.users.findOne({ username: user })._id;
      var listId = Lists.findOne({ title: list })._id;
      var cards = Cards.find({ $and: [
        { members: { $in: [ userId ] }},
        { listId: listId }
      ]});
      cards.forEach(function (card) {
        var obj = { title: card.title };

        if (Session.get('showCommits') === true) {
          if (card.hasOwnProperty('commits')) {
            var commits = "";
            for (var i = 0; i < card.commits.length; ++i) {
              commits += card.commits[i];
              if (i != card.commits.length - 1)
                commits += ", ";
            }
            if (commits.length)
              obj.commits = commits;
          }
        }

        if (Session.get('showIssues') ===  true) {
          if (card.hasOwnProperty('issues') && card.issues.length) {
            obj.issues = card.issues;
          }
        }

        if (Session.get('showDescriptions') === true) {
          if (card.hasOwnProperty('description') && card.description.length) {
            obj.description = card.description;
          }
        }

        if (Session.get('showComments') === true) {
          obj.comments = [];
          var comments = CardComments.find({ cardId: card._id });
          comments.forEach(function (comment) {
            var user = Accounts.users.findOne({ _id: comment.userId }).username;
            obj.comments.push(user + ': ' + comment.text);
          });
        }

        if (Session.get('showDueDate') === true) {
          if (card.hasOwnProperty('dueAt')) {
            obj.dueAt = moment(card.dueAt).format('dddd (LL)');
          }
        }

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
