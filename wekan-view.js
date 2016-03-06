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
        { value: "Next",  label: "Next Week"  },
        { value: "Last",  label: "Last Week"  },
        { value: "All",   label: "All Time"   },
      ];
    },
  });

  Template.dateSummary.helpers({
    commits: function (date) {
      const ids = [];
      const cards = Cards.find({ $and: [
        { 'commits':  { $exists: true, $ne: [] }},
        { 'dueAt':    { $exists: true }}
      ]});

      cards.forEach(function (card) {
        if (card.hasOwnProperty('dueAt') && date == moment(card.dueAt).format('dddd (LL)')) {
          if (!card.archived) {
            let cardStr = "";
            for (var i = 0; i < card.commits.length; ++i) {
              cardStr += card.commits[i];
              if (i < card.commits.length - 1) {
                cardStr += ", ";
              }
            }
            if (Session.get('showUsers') === true) {
              let members = "";
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
      const dates = [];

      if (Session.get('displayType') == 'All') {

        const cards = Cards.find({ $and: [
          { 'commits':  { $exists: true, $ne: [] }},
          { 'dueAt':    { $exists: true }}
        ]});

        let firstDay, lastDay;
        cards.forEach(function (card) {
          if (card.hasOwnProperty('dueAt')) {
            const cardMoment = moment(card.dueAt);
            const momentStr = cardMoment.format('YYYY MM DD');
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

      } else {

        let diff = 0;
        if (Session.get('displayType') == 'Next') {
          diff = 7;
        } else if (Session.get('displayType') == 'Last') {
          diff = -7;
        }
        for (var i = 0; i < 7; ++i) {
          let curr = new Date();
          curr.setDate(curr.getDate() + diff);
          const first = curr.getDate() - curr.getDay();
          const thisDay = new Date(curr.setDate(first + i)).toUTCString();
          dates.push(moment(thisDay).format('dddd (LL)'));
        }

        return dates;
      }

    },
  });

  // Group by User

  Session.setDefault('showDescriptions',  true    );
  Session.setDefault('showCommits',       true    );
  Session.setDefault('showIssues',        true    );
  Session.setDefault('showComments',      true    );
  Session.setDefault('showDates',         true    );

  Template.userSettings.events = {
    'change #showDescriptions': function (evt) {
      Session.set('showDescriptions', evt.currentTarget.checked);
    },
    'change #showCommits': function (evt) {
      Session.set('showCommits', evt.currentTarget.checked);
    },
    'change #showIssues': function (evt) {
      Session.set('showIssues', evt.currentTarget.checked);
    },
    'change #showComments': function (evt) {
      Session.set('showComments', evt.currentTarget.checked);
    },
    'change #showDates': function (evt) {
      Session.set('showDates', evt.currentTarget.checked);
    },
  };

  Template.userSummary.helpers({
    users: function() {
      const ids = [];
      const cards = Cards.find({});
      cards.forEach(function (card) {
        for (var i = 0; i < card.members.length; ++i) {
          const memberId = card.members[i];
          const account = Accounts.users.findOne({ _id: memberId }).username;
          let exists = false;
          for (var j = 0; j < ids.length; ++j) {
            if (ids[j].user == account) {
              exists = true;
            }
          }
          if (!exists) {
            const userCards = Cards.find({ members: { $in: [ memberId ] }});
            const lists = [];
            userCards.forEach(function (userCard) {
              const listId = Lists.findOne({ _id: userCard.listId }).title;
              if (lists.indexOf(listId) == -1)
                lists.push(listId);
            });
            ids.push({
              'user':   account,
              'lists':  lists
            });
          }
        }
      });
      return ids;
    },
    cards: function(user, list) {
      const c = [];
      const userId = Accounts.users.findOne({ username: user })._id;
      const listId = Lists.findOne({ title: list })._id;
      const cards = Cards.find({ $and: [
        { members: { $in: [ userId ] }},
        { listId: listId }
      ]});
      cards.forEach(function (card) {
        const obj = { title: card.title };

        if (Session.get('showDescriptions') === true) {
          if (card.hasOwnProperty('description') && card.description.length) {
            obj.description = card.description;
          }
        }

        if (Session.get('showCommits') === true) {
          if (card.hasOwnProperty('commits')) {
            let commits = "";
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

        if (Session.get('showDates') === true) {
          if (card.hasOwnProperty('dueAt')) {
            obj.dueAt = moment(card.dueAt).format('Do MMMM, YYYY (dddd)');
          }
          if (card.hasOwnProperty('startAt')) {
            obj.startAt = moment(card.startAt).format('Do MMMM, YYYY (dddd)');
          }
        }

        if (Session.get('showComments') === true) {
          obj.comments = [];
          const comments = CardComments.find({ cardId: card._id });
          comments.forEach(function (comment) {
            const user = Accounts.users.findOne({ _id: comment.userId }).username;
            obj.comments.push(user + ': ' + comment.text);
          });
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
