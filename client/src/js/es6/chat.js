'use strict';

import _ from 'underscore'

import SETTINGS from './settings'
import User from './models/user'
import PrivateThread from './models/private_thread'


class Chat {
  constructor(app) {
    this.app = app;

    this.wrapper = document.getElementById("chat-wrapper");
    this.current_user_container = document.getElementById("current-user-info");
    this.current_private_thread_container = document.getElementById("private-threads-list");

    this.current_user = null;
    this.users = {};
    this.privateThreads = {};

    this.renderCurrentUser = function (current_user) {
      return `<div class="pull-left image">
                <img src="${current_user.thumbnail}" class="img-circle" alt="User Image">
              </div>
              <div class="pull-left info">
                <p>${current_user.username}</p>
                <a href="#"><i class="fa fa-circle text-success"></i> Online</a>
              </div>`
    };

    this.renderPrivateThread = function (thread) {
      let $this = this;
      let interlocutor = null;

      _.each(thread.participants, function (user) {
        if (user.id !== $this.current_user.id) {
          interlocutor = user;
        }
      });

      return `<li id="private_thread_${thread.id}">
                <div class="user-panel">
                  <div class="pull-left image">
                    <img src="${interlocutor.thumbnail}" class="img-circle" alt="${interlocutor.username} Image">
                  </div>
                  <div class="pull-left thread-info">
                    <p>${interlocutor.username}</p>
                    <small><i class="fa fa-circle text-success"></i> Online</small>
                  </div>
                </div>
              </li>`
    };

    this.renderUserAsPrivateThread = function (user) {

      return `<li id="user_private_thread_${user.id}">
                <div class="user-panel">
                  <div class="pull-left image">
                    <img src="${user.thumbnail}" class="img-circle" alt="${user.username} Image">
                  </div>
                  <div class="pull-left thread-info">
                    <p>${user.username}</p>
                    <small><i class="fa fa-circle text-success"></i> Online</small>
                  </div>
                </div>
              </li>`
    };

  }

  show() {
    let $this = this;
    jQuery(this.wrapper).removeClass('hide').hide().fadeIn(1000, function () {
      $this._displayCurrentUser();
      $this._displayPrivateThreads();
    });
  }

  hide() {
    jQuery(this.wrapper).addClass('hide');
  }

  hideCurrentUser() {
    jQuery(this.current_user_container).html('');
  }

  _displayCurrentUser() {
    let $this = this;

    // show loader
    $this.app.loader.appendSphere('current-user-info', jQuery($this.current_user_container));

    // load current user info
    $this._loadCurrentUser().then(
      function () {
        // hide loader and render current user info html
        $this.app.loader.removeSphere('current-user-info', function () {
          // place html
          jQuery($this.renderCurrentUser($this.current_user))
            .hide()
            .appendTo(jQuery($this.current_user_container))
            .fadeIn();
        });
      },
      function (err) {
      }
    );
  }

  _displayPrivateThreads() {
    let $this = this;

    $this.app.loader.appendSphere('direct-threads', jQuery('#direct-threads'));

    // load users
    $this._loadUsers().then(function () {
      // load private threads
      $this._loadPrivateThreads().then(function () {
        $this.app.loader.removeSphere('direct-threads', function () {
          // merge and render threads and users
          render()
        });
      });
    });

    function render() {
      let threads = [];
      let usersToExclude = new Set();

      // add private threads
      _.each($this.privateThreads, function (thread) {
        // we will exclude this users later
        _.each(thread.participants, function (user) {
          usersToExclude = usersToExclude.add(user.id);
        });

        threads.push(thread);
      });

      // sort private threads by last_message
      threads = _.sortBy(threads, 'lastMessage').reverse();

      // add users (future threads)
      _.each($this.users, function (user) {
        // if we don't have private thread with this user
        if (!usersToExclude.has(user.id)) {
          threads.push(user);
        }
      });

      _.each(threads, function (thread) {

        switch (thread.constructor.name) {
          case 'PrivateThread':
            // render thread
            jQuery($this.renderPrivateThread(thread))
              .hide()
              .appendTo(jQuery($this.current_private_thread_container))
              .fadeIn();
            break;
          case 'User':
            // render user
            jQuery($this.renderUserAsPrivateThread(thread))
              .hide()
              .appendTo(jQuery($this.current_private_thread_container))
              .fadeIn();
            break;
            break;
        }
      })

    }
  }

  _loadCurrentUser() {
    let $this = this;

    // get current user info
    return this.app.axios.get(SETTINGS.api.http.stateEndpoint)
      .then(function (response) {
        $this.current_user = new User(
          response.data.current_user.id,
          response.data.current_user.username,
          response.data.current_user.first_name,
          response.data.current_user.last_name,
          response.data.current_user.profile_avatar,
          response.data.current_user.profile_avatar_thumbnail
        )
      })
      .catch(function (error) {
        throw error;
      });
  }

  _loadUsers() {
    let $this = this;

    // get current user info
    return this.app.axios.get(SETTINGS.api.http.userListEndpoint)
      .then(function (response) {

        _.each(response.data, function (user) {
          $this.users[user.id] = new User(
            user.id,
            user.username,
            user.first_name,
            user.last_name,
            user.profile_avatar,
            user.profile_avatar_thumbnail
          )
        });

      })
      .catch(function (error) {
        throw error;
      });
  }

  _loadPrivateThreads() {
    let $this = this;

    // get current user info
    return this.app.axios.get(SETTINGS.api.http.privateThreadListCreateEndpoint)
      .then(function (response) {
        _.each(response.data, function (privateThread) {
          let participants = {};

          _.each(privateThread.participants, function (participant) {
            participants[participant] = $this.users[participant];
          });

          $this.privateThreads[privateThread.id] = new PrivateThread(
            privateThread.id,
            privateThread.last_message,
            $this.users[privateThread.initiator],
            participants
          )
        });
      })
      .catch(function (error) {
        throw error;
      });
  }

}

export {Chat as default}