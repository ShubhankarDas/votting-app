const Profile = {
  init: function () {
    $.ajax({
      url: '/user',
      success: function (user) {
        $('#email').val(user.email);
        $('#ssn').val(user.ssn);
        $('#phone').val(user.phone);
        $('#address').val(user.address);
        $('#phrase').val(user.phrase);
      },
    });
  },
};

$(function () {
  $(window).load(function () {
    Profile.init();
  });
});
