import {
  Component,
  Signal,
  WritableSignal,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// Type Definitions
type User = {
  name: string;
  userID: number;
};

type Comment = {
  userID: number;
  comment: string;
  taggedUsers: Map<number, User>;
};

// Regular Expression Definitions to help with validation.
// const tagPattern: RegExp = new RegExp(/([ ]|)\@([A-Za-z])\w+/g);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  // Example Data
  users: Array<User> = [
    { userID: 1, name: 'Kevin' },
    { userID: 2, name: 'Jeff' },
    { userID: 3, name: 'Bryan' },
    { userID: 4, name: 'Gabbey' },
  ];
  comments: Array<Comment> = [
    {
      userID: 0,
      comment: 'This is comment to @jeff, where I mention @BRYAN',
      taggedUsers: new Map([
        [2, { userID: 2, name: 'Jeff' }],
        [3, { userID: 3, name: 'Bryan' }],
      ]),
    },
    {
      userID: 1,
      comment: 'This is tagging @Kevin',
      taggedUsers: new Map([
        [1, { userID: 1, name: 'Kevin' }]
      ]),
    },
  ];
  // Writable Signals
  search: WritableSignal<boolean> = signal(false);
  query: WritableSignal<string> = signal('');
  queryIndex: WritableSignal<number> = signal(0);
  comment: WritableSignal<Comment> = signal({
    userID: 0,
    comment: '',
    taggedUsers: new Map(),
  });
  // Computed Signals
  usersMatchingQuery: Signal<Array<User>> = computed(() =>
    this.users.filter((user) => this.isMatch(user, this.query()))
  );

  // Utility Functions
  showAlert(comment: string) {
    const alert = document.getElementById('alert') as HTMLDivElement;
    alert.innerText = comment;
    alert.style.visibility = 'unset';
    setTimeout(() => {
      alert.style.visibility = 'hidden';
    }, 2000);
  }

  isMatch(user: User, query: string) {
    const formattedUser = user.name.normalize().toLowerCase();
    const formattedQuery = query.normalize().toLowerCase();
    return query !== ''
      ? formattedUser.slice(0, query.length) === formattedQuery
      : true;
  }

  // Input Functions
  formatCommentInput(contentEditableElement: HTMLElement)
  {
    contentEditableElement.innerHTML = this.parseComment(this.comment())
    const range = document.createRange() as Range;
    const selection = window.getSelection() as Selection;
    range.selectNodeContents(contentEditableElement);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    contentEditableElement.focus();
  }

  selectUser(e: Event) {
    const value: number = parseInt((e.target as HTMLInputElement).value);
    const selectedUser: User = this.users.filter(
      (user) => user.userID === value
    )[0];
    const input: HTMLElement = document.getElementById(
      'comment-input'
    ) as HTMLElement;
    const commentQueryDifference: number = this.comment().comment.length - this.query().length - 1;
    const trimmedCommentText: string = input.innerText.slice(0, commentQueryDifference);
    const newCommentText: string = trimmedCommentText + '@' + selectedUser.name + '';
    const newComment: Comment = {
      ...this.comment(),
      comment: newCommentText,
      taggedUsers: this.comment().taggedUsers.set(selectedUser.userID, selectedUser),
    }
    this.comment.update((comment) => comment = newComment);
    this.formatCommentInput(input);
    this.search.update((val) => !val);
  }

  handleInput(e: KeyboardEvent): void {
    // If user presses enter, submit comment
    if (e.code === 'Enter') {
      this.submitComment();
      return;
    }
    const target: HTMLElement = e.target as HTMLElement;
    const length: number = target.innerText.length;
    const input: string = target.innerText[length - 1];

    const validTag: boolean =
      input === '@' &&
      (length - 2 === -1 || target.innerText[length - 2] === ' ');
    const validTagStart: boolean =
      target.innerText[length - 2] === '@' &&
      (length - 3 === -1 || target.innerText[length - 3] === ' ');
    if (validTag) {
      this.search.set(true);
      this.query.set('');
      this.queryIndex.set(length - 1);
    } else if (validTagStart) {
      this.query.set(input.normalize().toLowerCase());
    } else if (this.query().length > 0) {
      this.query.update((_query) => (_query = _query + input).normalize().toLowerCase());
    } else {
      this.search.set(false);
      this.query.set('');
      this.queryIndex.set(length - 1);
    }
    // Update comment before formatting message
    this.comment.update(prev => prev = {
      ...prev,
      comment: target.innerText,
    });
    this.formatCommentInput(target);
  }


  submitComment() {
    // Prune invalid tags.
    this.comment.update(prev => prev = {
      ...prev,
      taggedUsers: this.validateTags(
        this.comment().comment,
        this.comment().taggedUsers
      ),
    });
    // Only post if comment is length > 0
    if (this.comment().comment.length > 0) {
      // Only alert if users have been tagged.
      if (this.comment().taggedUsers.size > 0) {
        let comment: string = 'Sending alerts to:\n';
        for (const [id, user] of this.comment().taggedUsers) {
          comment += user.name + '\n';
        }
        this.showAlert(comment);
      }
      // Add to comments.
      this.comments.push(this.comment());
    }
    // Reset inputs.
    (document.getElementById('comment-input') as HTMLDivElement).innerText = '';
    this.comment.set({
      userID: 0,
      comment: '',
      taggedUsers: new Map(),
    });
  }

  validateTags(comment: string, tags: Map<number, User>): Map<number, User> {
    for(const [id, user] of tags){
      if(!comment.match(new RegExp(`@${user.name}`, 'i'))){
        tags.delete(id);
      }
    }
    return tags;
  }

  parseComment(_comment: Comment): string {
    const { comment, taggedUsers } = _comment;
    let parsed: string = comment;
    for(const [ _, user] of taggedUsers){
      const matches = comment.match(new RegExp(`@${user.name}`, 'i'));
      if(matches){
        matches.forEach((match) => {
          parsed = parsed.replaceAll(match, `<b>@${user.name}</b>`)
        })
      }
    }
    return parsed;
  }
}
