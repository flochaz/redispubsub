$(document).ready(function () {
    //Check if the user is rejoining
    //ps: This value is set by Express if browser session is still valid
    var user = $('#user').text();
    var user_id = null;
    var gameKey = 'sMeQMYVh1jSJZZ62l2';

    // show join box
    if (user === "") {
        $('#ask').show();
        $('#ask input').focus();
    } else { //rejoin using old session
        join(user);
    }

    // join on enter
    $('#ask input').keydown(function (event) {
        if (event.keyCode == 13) {
            $('#ask a').click();
        }
    });

    /*
When the user joins, hide the join-field, display chat-widget and also call 'join' function that
initializes Socket.io and the entire app.
*/
    $('#ask a').click(function () {
        join($('#ask input').val());
    });

    function join(name) {
        $('#ask').hide();
        $('#channel').show();
        $('#game').show();
        $('#alreadyplayed').hide();
        /*
Connect to socket.io on the server.
*/

        
        var host = window.location.host.split(':')[0];
        var socket = io.connect('http://' + host, {reconnect:false, 'try multiple transports':false});
        var intervalID;
        var reconnectCount = 0;

        socket.on('connect', function () {
            console.log('connected');
        });
        socket.on('connecting', function () {
            console.log('connecting');
        });
        socket.on('disconnect', function () {
            console.log('disconnect');
            intervalID = setInterval(tryReconnect, 4000);
        });
        socket.on('connect_failed', function () {
            console.log('connect_failed');
        });
        socket.on('error', function (err) {
            console.log('error: ' + err);
        });
        socket.on('reconnect_failed', function () {
            console.log('reconnect_failed');
        });
        socket.on('reconnect', function () {
            console.log('reconnected ');
        });
        socket.on('reconnecting', function () {
            console.log('reconnecting');
        });

        var tryReconnect = function () {
            ++reconnectCount;
            if (reconnectCount == 5) {
                clearInterval(intervalID);
            }
            console.log('Making a dummy http call to set jsessionid (before we do socket.io reconnect)');
            $.ajax('/')
                .success(function () {
                    console.log("http request succeeded");
                    //reconnect the socket AFTER we got jsessionid set
                    socket.socket.reconnect();
                    clearInterval(intervalID);
                }).error(function (err) {
                    console.log("http request failed (probably server not up yet)");
                });
        };

        /*
When the user Logs in, send a HTTP POST to server w/ user name.
*/
        $.post('/user', {"user":name})
            .success(function () {
                // send join message
                socket.emit('join', JSON.stringify({}));
                $.post("http://openkit-server.cloudfoundry.com/users", 
         {
             "api":  gameKey,  
             "app_key": gameKey, 
             "user": { 
                 "nick": name
                 }
             },
             null,
             "json"
         ).done(function(data) {
             user_id = data.id;
             alert("User Id: " + user_id);
});
            }).error(function () {
                console.log("error");
            });

        var container = $('div#msgs');

        /*
When a message comes from the server, format, colorize it etc. and display in the chat widget
*/
        socket.on('chat', function (msg) {
            var message = JSON.parse(msg);

            var action = message.action;
            var struct = container.find('li.' + action + ':first');

            if (struct.length < 1) {
                console.log("Could not handle: " + message);
                return;
            }

            // get a new message view from struct template
            var messageView = struct.clone();

            // set time
            messageView.find('.time').text((new Date()).toString("HH:mm:ss"));

            switch (action) {
                case 'message':
                    var matches;
                    // someone starts chat with /me ...
                    if (matches = message.msg.match(/^\s*[\/\\]me\s(.*)/)) {
                        messageView.find('.user').text(message.user + ' ' + matches[1]);
                        messageView.find('.user').css('font-weight', 'bold');
                        // normal chat message
                    } else {
                        messageView.find('.user').text(message.user);
                        messageView.find('.message').text(': ' + message.msg);
                    }
                    break;
                case 'control':
                    messageView.find('.user').text(message.user);
                    messageView.find('.message').text(message.msg);
                    messageView.addClass('control');
                    break;
            }

            // color own user:
            if (message.user == name) messageView.find('.user').addClass('self');

            // append to container and scroll
            container.find('ul').append(messageView.show());
            container.scrollTop(container.find('ul').innerHeight());
        });

        /*
When the user creates a new chat message, send it to server via socket.emit w/ 'chat' event/channel name
*/
        $('#channel form').submit(function (event) {
            event.preventDefault();
            var input = $(this).find(':input');
            var msg = input.val();
            socket.emit('chat', JSON.stringify({action:'message', msg:msg}));
            input.val('');
        });
        
        
        
        $('button#play').click(function() {
            var score = Math.floor((Math.random()*100)+1);
                $('#alreadyplayed').show();
                $('#score').html(score);
        })
        $('#game form').submit(function (event) {
            event.preventDefault();
            var input = $(this).find(':input');
            var score = $('#score').text();
            var msg = input.val() + 'I post the score ' + score ;
            var gameKey = 'sMeQMYVh1jSJZZ62l2';

            socket.emit('chat', JSON.stringify({action:'message', msg:msg}));
            input.val('');
            $.post("http://openkit-server.cloudfoundry.com/scores", 
                { "app_key": gameKey,
                score: { 
                    "leaderboard_id": 1, 
                    user_id: user_id, 
                    value: score, 
                    display_string: score + " random score"}
         },
         null,
         "json"
     )
        });
    }
});