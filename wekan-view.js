Cards = new Mongo.Collection('cards');
Comments = new Mongo.Collection('card_comments');
Lists = new Mongo.Collection('lists');

getDays = function() {
  const days = [];
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
    days.push(moment(thisDay));
  }
  return days;
};

if (Meteor.isClient) {

  Meteor.subscribe('cards');

  Session.setDefault('groupBy',       'date'  );
  Session.setDefault('displayType',   'Week'  );

  Template.info.events = {
    'change #groupBy': function (evt) {
      Session.set('groupBy', evt.currentTarget.value);
    },
    'change #displayType': function (evt) {
      Session.set('displayType', evt.currentTarget.value);
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
        { value: 'date',  label: 'Date' },
        { value: 'user',  label: 'User' },
      ];
    },

    displayTypeOptions: function () {
      return [
        { value: 'Week',  label: 'This Week'  },
        { value: 'Next',  label: 'Next Week'  },
        { value: 'Last',  label: 'Last Week'  },
        { value: 'All',   label: 'All Time'   },
      ];
    },
  });

  // Group by Date

  Session.setDefault('showUsers',     false );
  Session.setDefault('showTitles',    false );

  Template.dateSettings.events = {
    'change #showUsers': function (evt) {
      Session.set('showUsers', evt.currentTarget.checked);
    },
    'change #showTitles': function (evt) {
      Session.set('showTitles', evt.currentTarget.checked);
    },
  };

  Template.dateSummary.helpers({
    commits: function (date) {
      const ids = [];
      const cards = Cards.find({ $and: [
        { commits:   { $exists: true, $ne: [] }},
        { dueAt:     { $exists: true }},
        { archived:  false }
      ]});

      cards.forEach(function (card) {
        if (date == moment(card.dueAt).format('dddd (LL)')) {
          let cardStr = '';
          for (var i = 0; i < card.commits.length; ++i) {
            cardStr += card.commits[i];
            if (i < card.commits.length - 1) {
              cardStr += ', ';
            }
          }
          if (Session.get('showUsers') === true) {
            let members = '';
            for (var j = 0; j < card.members.length; ++j) {
              members += Accounts.users.findOne({ _id: card.members[j] }).username;
              if (j < card.members.length - 1) {
                members += ', ';
              }
            }
            if (members.length) {
              cardStr += ' (' + members + ')';
            }
          }
          if (Session.get('showTitles') === true) {
            cardStr += ': ' + card.title;
          }
          if (ids.indexOf(cardStr) == -1) {
            ids.push(cardStr);
          }
        }
      });

      if (!ids.length)
        ids.push('None');

      ids.sort();
      return ids;
    },

    dates: function () {
      const dates = [];

      if (Session.get('displayType') == 'All') {

        const cards = Cards.find({ $and: [
          { commits:  { $exists: true, $ne: [] }},
          { dueAt:    { $exists: true }},
          { archived:  false }
        ]});

        let firstDay, lastDay;
        cards.forEach(function (card) {
          const cardMoment = moment(card.dueAt);
          const momentStr = cardMoment.format('YYYY MM DD');
          if (dates.indexOf(momentStr) == -1) {
            dates.push(momentStr);
          }
        });

        dates.sort();

        for (var i = 0; i < dates.length; ++i) {
          dates[i] = moment(dates[i], 'YYYY MM DD').format('dddd (LL)');
        }

        return dates;

      } else {

        const days = getDays();
        for (let day of days) {
          dates.push(day.format('dddd (LL)'));
        }

        return dates;
      }

    },
  });

  // Group by User

  Session.setDefault('showDescriptions',    true  );
  Session.setDefault('showCommits',         true  );
  Session.setDefault('showIssues',          true  );
  Session.setDefault('showComments',        true  );
  Session.setDefault('showDates',           true  );

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
      const cards = Cards.find({ archived: false });
      cards.forEach(function (card) {
        for (let member of card.members) {
          const account = Accounts.users.findOne({ _id: member }).username;
          let exists = false;
          for (let id of ids) {
            if (id.user == account) {
              exists = true;
            }
          }
          if (!exists) {
            const userCards = Cards.find({ $and: [
              { members:  { $in: [ member ] }},
              { archived: false},
            ]});
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
      const listIds = Lists.find({ title: list });
      const lists = [];
      listIds.forEach(function (list) {
        lists.push(list._id);
      });
      const cards = Cards.find({ $and: [
        { members:  { $in: [ userId ] }},
        { listId:   { $in: lists }},
        { archived: false }
      ]});
      cards.forEach(function (card) {
        if (Session.get('displayType') != 'All') {
          const days = getDays();
          let validStart = false;
          let validDue = false;
          if (card.hasOwnProperty('startAt')) {
            const cardStart = moment(card.startAt).format('YYYY MM DD');
            for (let day of days) {
              if (day.format('YYYY MM DD') == cardStart) {
                validStart = true;
                break;
              }
            }
          }
          if (card.hasOwnProperty('dueAt')) {
            const cardDue = moment(card.dueAt).format('YYYY MM DD');
            for (let day of days) {
              if (day.format('YYYY MM DD') == cardDue) {
                validDue = true;
                break;
              }
            }
          }
          if (!validStart && !validDue) {
            return;
          }
        }
        const obj = { title: card.title };

        if (Session.get('showDescriptions') === true) {
          if (card.hasOwnProperty('description') && card.description.length) {
            obj.description = card.description.match(/[^\r\n]+/g);
          }
        }

        if (Session.get('showCommits') === true) {
          if (card.hasOwnProperty('commits')) {
            let commits = '';
            for (var i = 0; i < card.commits.length; ++i) {
              commits += card.commits[i];
              if (i != card.commits.length - 1)
                commits += ', ';
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
          const comments = Comments.find({ cardId: card._id });
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
