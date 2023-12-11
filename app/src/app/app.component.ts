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
  taggedUsers: Set<User>;
};

// Regular Expression Definitions to help with validation.
const alphabetPattern: RegExp = /([A-Za-z])/g;
const tagPattern: RegExp = /([ ]|)\@([A-Za-z])\w+/g;

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
      taggedUsers: new Set([
        { userID: 2, name: 'Jeff' },
        { userID: 3, name: 'Bryan' },
      ]),
    },
    {
      userID: 1,
      comment: 'This is tagging @Kevin',
      taggedUsers: new Set([{ userID: 1, name: 'Kevin' }]),
    },
  ];
  // Writable Signals
  search: WritableSignal<boolean> = signal(false);
  query: WritableSignal<string> = signal('');
  queryIndex: WritableSignal<number> = signal(0);
  comment: WritableSignal<Comment> = signal({
    userID: 0,
    comment: '',
    taggedUsers: new Set(),
  });
  // Computed Signals
  usersMatchingQuery: Signal<Array<User>> = computed(() =>
    this.users.filter((user) => this.isMatch(user, this.query()))
  );

  isMatch(user: User, query: string) {
    const formattedUser = user.name.normalize().toLowerCase();
    const formattedQuery = query.normalize().toLowerCase();
    return query !== ''
      ? formattedUser.slice(0, query.length) === formattedQuery
      : true;
  }

  selectUser(e: Event) {
    const value: number = parseInt((e.target as HTMLInputElement).value);
    const selectedUser: User = this.users.filter(
      (user) => user.userID === value
    )[0];
    const input: HTMLElement = document.getElementById(
      'comment-input'
    ) as HTMLElement;
    const trimmedCommentText: string = input.innerHTML.slice(
      0,
      this.comment().comment.length - this.query().length - 2
    );
    // Can't get inner text styling working right.
    // const newCommentText: string = trimmedCommentText + '<b>@' + selectedUser.name + '</b>';
    const newCommentText: string = trimmedCommentText + '@' + selectedUser.name;
    input.innerHTML = newCommentText;
    const newComment: Comment = {
      userID: this.comment().userID,
      comment: newCommentText,
      taggedUsers: this.comment().taggedUsers.add(selectedUser),
    };
    this.search.set(false);
    this.comment.set(newComment);
  }

  closeSearch() {
    this.search.set(false);
  }

  handleInput(e: KeyboardEvent) {
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
    } else if (
      this.query().length > 0 &&
      alphabetPattern.test(input.normalize().toLowerCase())
    ) {
      const query: string = target.innerText
        .slice(this.queryIndex() + 1, length)
        .normalize()
        .toLowerCase();
      this.query.set(query);
    } else {
      this.search.set(false);
      this.query.set('');
      this.queryIndex.set(0);
    }
    this.comment.set({
      userID: this.comment().userID,
      comment: target.innerText + input,
      taggedUsers: this.comment().taggedUsers,
    });
  }

  showAlert(comment: string) {
    const alert = document.getElementById('alert') as HTMLDivElement;
    alert.innerText = comment;
    alert.style.visibility = 'unset';
    setTimeout(() => {
      alert.style.visibility = 'hidden';
    }, 2000);
  }

  submitComment() {
    this.comment.set({
      userID: this.comment().userID,
      comment: this.comment().comment,
      taggedUsers: this.comment().taggedUsers,
    });

    if (this.comment().comment.length > 0) {
      if (this.comment().taggedUsers.size > 0) {
        let comment: string = '';
        for (const tag of this.comment().taggedUsers) {
          comment += tag.name + '\n';
        }
        this.showAlert(comment);
      }
      this.comments.push(this.comment());
    }
    (document.getElementById('comment-input') as HTMLDivElement).innerText = '';
    this.comment.set({
      userID: 0,
      comment: '',
      taggedUsers: new Set(),
    });
  }

  getTags(message: string): Array<RegExpMatchArray> {
    return [...message.matchAll(tagPattern)];
  }

  validateTags(
    commentStr: string,
    tags: Set<User>
  ): { commentStr: string; tags: Set<User> } {
    const filteredTags = new Set<User>();
    const matchedTags = commentStr.match(tagPattern);

    if (matchedTags) {
      for (const tag of matchedTags) {
        tags.forEach((_tag) => {
          if (
            _tag.name.normalize().toLowerCase() ===
            tag.trim().slice(1, tag.length).normalize().toLowerCase()
          ) {
            filteredTags.add(_tag);
          }
        });
      }
    }
    return {
      commentStr: commentStr,
      tags: filteredTags,
    };
  }

  parseComment(comment: string): string {
    const tags: RegExpMatchArray | null = comment.match(tagPattern);
    let parsed: string = comment;
    if (tags) {
      for (const tag of tags) {
        parsed = parsed.replace(tag, `<b>${tag}</b>`);
      }
    }
    return parsed;
  }
}
