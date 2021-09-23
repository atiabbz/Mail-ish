document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  document.querySelector('#compose-form').onsubmit = send_email;

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#content-view').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#content-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3 id="mailbox">${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  load_emails(mailbox);
}

function send_email(event) {
  // something to do with page reloading, doesn't send request properly w/o this line
  event.preventDefault();

  //post form data to backend
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log(result);
  })

  // add delay to ensure the just sent mail is updated in the database before function call
  setTimeout(() => load_mailbox('sent'), 100);
}

function load_emails(mailbox) {
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    emails.forEach(email => {
      const email_div = document.createElement('div');
      email_div.setAttribute('id', email.id);
      email_div.setAttribute('class', 'email_div');
      if (email.read === true) {
        email_div.style.backgroundColor = '#dee2e6';
      }

      email_div.innerHTML = `<span style='font-weight: bold; float: left;'>
                              ${email.sender}&emsp;
                            </span>
                              ${email.subject}
                            <span class='text-muted' style='float: right;'>
                              ${email.timestamp}
                            </span>`;

      email_div.addEventListener('click', view_email);
      document.querySelector('#emails-view').appendChild(email_div);
    });
  });
}

function view_email() {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#content-view').style.display = 'block';

  fetch(`/emails/${this.id}`)
  .then(response => response.json())
  .then(email => {
    // mark as read
    fetch(`/emails/${email.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    })

    const content_div = document.querySelector('#content-view');
    content_div.innerHTML = `
      <p>
        <b>From:</b> ${email.sender}<br>
        <b>To:</b> ${email.recipients.join(', ')}<br>
        <b>Subject:</b> ${email.subject}<br>
        <b>Timestamp:</b> ${email.timestamp}<br>
      </p>
      <button id="reply" class="btn btn-sm btn-outline-primary">Reply</button>
      <button id="unread" class="btn btn-sm btn-outline-primary">Mark as Unread</button>
      <hr>
      <p style="white-space: pre-line;">${email.body}</p>`;
      //white-space: pre-line; for correctly showing \n chars

    const back_btn = document.createElement('button');
    back_btn.innerHTML = 'Back';
    back_btn.setAttribute('id', 'back');
    back_btn.setAttribute('class', 'btn btn-sm btn-outline-primary');
    back_btn.addEventListener('click', () => { load_mailbox(get_source_mailbox()) });
    content_div.insertAdjacentHTML('beforeend', '<hr>');
    content_div.appendChild(back_btn);

    //
    const btn_flag = ((get_source_mailbox() === 'inbox' || get_source_mailbox() === 'archive'));
    var archive_btn;
    if (btn_flag) {
      archive_btn = document.createElement('button');
      archive_btn.setAttribute('id', 'archive');
      archive_btn.setAttribute('class', 'btn btn-sm btn-outline-primary');
      if (email.archived) {
        archive_btn.innerHTML = 'Unarchive';
      } else {
        archive_btn.innerHTML = 'Archive';
      }
    }

    if (archive_btn !== undefined) {
      content_div.insertBefore(archive_btn, document.querySelector('#unread'));
      document.querySelector('#unread').insertAdjacentHTML('beforebegin', '\n'); //buttons start touching otherwise lol
      archive_btn = document.querySelector('#archive');
      archive_btn.addEventListener('click', () => {
        //mark as archived onclick
        fetch(`/emails/${email.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            archived: (archive_btn.innerHTML === 'Archive')
          })
        })
        setTimeout(() => { load_mailbox('inbox') }, 100);
      });
    }

    const reply_btn = document.querySelector('#reply');
    reply_btn.addEventListener('click', () => {
      compose_email();
      document.querySelector('#compose-recipients').value = get_reply_recipients(email);

      if (email.subject.startsWith('Re: ')) {
        document.querySelector('#compose-subject').value = email.subject;
      } else {
        document.querySelector('#compose-subject').value = 'Re: ' + email.subject;
      }

      document.querySelector('#compose-body').value = `\n\nOn ${email.timestamp} ${email.sender} wrote:\n` + email.body;
    });

    if (email.recipients.length > 1) {
        var reply_all_btn = document.createElement('button');
        reply_all_btn.setAttribute('id', 'reply_all');
        reply_all_btn.setAttribute('class', 'btn btn-sm btn-outline-primary');
        reply_all_btn.innerHTML = 'Reply to All';
        reply_all_btn.addEventListener('click', () => {
            compose_email();
            document.querySelector('#compose-recipients').value = get_reply_all_recipients(email);

            if (email.subject.startsWith('Re: ')) {
                document.querySelector('#compose-subject').value = email.subject;
            } else {
                document.querySelector('#compose-subject').value = 'Re: ' + email.subject;
            }

            document.querySelector('#compose-body').value = `\n\nOn ${email.timestamp} ${email.sender} wrote:\n` + email.body;
        });
        reply_btn.insertAdjacentElement('afterend', reply_all_btn);
        document.querySelector('#reply_all').insertAdjacentHTML('beforebegin', '\n'); //buttons start touching otherwise lol
    }

    const unread_btn = document.querySelector('#unread');
    unread_btn.addEventListener('click', () => {
      //mark as unread onclick
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          read: false
        })
      })
      setTimeout(() => {load_mailbox(get_source_mailbox())}, 100);
    });
  })
}

function get_reply_recipients(email) {
    const current_user = document.querySelector('#current-user').innerHTML;
    const index = email.body.lastIndexOf(' wrote:') - 1;

    //no replies in thread (-1 - 1 = -2)
    if (index === -2) {
        //current_user probably doesn't want to reply to themselves
        if (email.sender === current_user) {
            return email.recipients.join(', ');
        }
        return email.sender;
    }

    //find first ever email.sender in the bottom `On ${email.timestamp} ${email.sender} wrote:`
    var original = '';
    while (email.body[index] != ' ') {
        original += email.body[index];
        index--;
    }
    //reverse generated string (since search was done backwards):
    //split into array of chars, reverse the array, join chars into string
    original = original.split('').reverse().join('');

    //current_user probably doesn't want to reply to themselves
    if (original === current_user) {
        if (email.sender === current_user) {
          return email.recipients.join(', ');
        }
        return email.sender;
    }
    return original;
}

function get_reply_all_recipients(email) {
    const current_user = document.querySelector('#current-user').innerHTML;
    console.log(current_user);
    var recipients = email.recipients;
    recipients.push(email.sender);
    console.log(recipients);
    const index = recipients.indexOf(current_user);
    console.log(index);
    if (index > -1) {
        recipients.splice(index, 1);
    }
    return recipients.join(', ');
}

function get_source_mailbox() {
  return document.querySelector('#mailbox').innerHTML.toLowerCase();
}