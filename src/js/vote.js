var Vote = {
  render: function () {
    var electionInstance;
    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Load contract data
    App.contracts.Election.deployed()
      .then(function (instance) {
        electionInstance = instance;
        return electionInstance.candidatesCount();
      })
      .then(function (candidatesCount) {
        var candidatesResults = $('#candidatesResults');
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        for (var i = 1; i <= candidatesCount; i++) {
          electionInstance.candidates(i).then(function (candidate) {
            var id = candidate[0];
            var name = candidate[1];
            var voteCount = candidate[2];

            // Render candidate Result
            var candidateTemplate =
              '<tr><th>' +
              id +
              '</th><td>' +
              name +
              '</td><td>' +
              voteCount +
              '</td></tr>';
            candidatesResults.append(candidateTemplate);

            // Render candidate ballot option
            var candidateOption =
              "<option value='" + id + "' >" + name + '</ option>';
            candidatesSelect.append(candidateOption);
          });
        }
        return electionInstance.voters(App.account);
      })
      .then(function (hasVoted) {
        // Do not allow a user to vote
        if (hasVoted) {
          $('form').hide();
        }
        loader.hide();
        content.show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  castVote: function () {
    var candidateId = $('#candidatesSelect').val();
    $.ajax({
      url: '/user',
      success: function (user) {
        if (user.voted || user.account !== App.account) {
          return;
        }
        App.contracts.Election.deployed()
          .then(function (instance) {
            return instance.vote(candidateId, { from: App.account });
          })
          .then(function (result) {
            // Wait for votes to update
            $('#content').hide();
            $('#loader').show();

            $.ajax({
              url: '/vote',
              success: function (user) {
                window.location.replace('/vote');
              },
            });
          })
          .catch(function (err) {
            console.error(err);
          });
      },
    });
  },
};
