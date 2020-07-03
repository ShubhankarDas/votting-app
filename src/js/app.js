MY_ADDRESS = '0x7912da25D8c8b10d1D4d27b7D3D9A459d23176cb';

App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: function () {
    App.initWeb3();
  },

  initWeb3: function () {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
      return App.initContract();
    } else {
      // Specify default instance if no web3 instance provided
      try {
        App.web3Provider = new Web3.providers.HttpProvider(
          'http://localhost:7545'
        ).enable();
        web3 = new Web3(App.web3Provider);
        return App.initContract();
      } catch (e) {
        console.log(e.message);
      }
    }
  },

  initContract: function () {
    $.getJSON('Election.json', function (election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.initAccount();
      if (typeof Vote !== 'undefined') Vote.render();
    });
  },

  initAccount: function () {
    // Load account data
    web3.eth.getCoinbase(function (err, account) {
      if (err === null) {
        App.account = account;
        $('#accountAddress').val(account);
        if ($('#accountAddressText').length) {
          $.ajax({
            url: '/user',
            success: function (user) {
              console.log('here');
              $('#accountAddressText').html(
                'Your Pass  Phrase: ' + user.phrase
              );
            },
          });
        }
      }
    });
  },

  donate: function (donateAmount, callback) {
    let user_address = App.account;

    web3.eth.sendTransaction(
      {
        to: MY_ADDRESS,
        from: user_address,
        value: web3.toWei(donateAmount, 'ether'),
      },
      function (err, transactionHash) {
        if (err) {
          message = `Donation failed: ${err.message}`;
          console.log(err.message);
        } else {
          message = 'Donation successful';
        }
        callback(message);
      }
    );
  },

  showDonateModal: function (callback) {
    callback(App.account !== '0x0');
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });

  $('#donate-cta').click(function () {
    App.showDonateModal(function (account) {
      if (account) {
        showModal();
      } else {
        showModal(
          'You need to install <a href="https://metamask.io/">MetaMask</a> to continue the Donation.'
        );
      }
    });
  });

  $('#pay').click(function () {
    let amount = $('#amount').val();
    $('#pay').attr('disabled', true);
    App.donate(amount, function (message) {
      showModal(message);
    });
  });

  $('#amount').on('keyup', function () {
    $('#pay').attr('disabled', !$('#amount').val().trim().length);
  });

  $('#donate-modal').click(function (e) {
    if (e.target.id === 'donate-modal') {
      $('#donate-modal').hide();
    }
  });

  function showModal(message) {
    if (message) {
      $('#message').html(message);
      $('#message').show();
      $('#pay, #amount').hide();
    } else {
      $('#message').hide();
      $('#amount').val('');
      $('#pay, #amount').show();
      $('#pay').attr('disabled', true);
    }
    $('#donate-modal').show();
  }
});
