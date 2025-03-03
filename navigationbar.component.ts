import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { User } from '@realworld/core/api-types';
/*
The navigation bar component takes as angular 19 feature 
required field input "USER".
*/
@Component({
  selector: 'cdt-navbar',
  templateUrl: './navbar.component.html',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationbarComponent {
  protected readonly user = input.required<User>();
  protected readonly isLoggedIn = input.required<boolean>();
}
