import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroService } from '../hero.service';

import { map } from 'rxjs/operators';

// With async pipe, can change to OnPush change detection.
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  // DJK1 Assign to the declared Observable in the service
  heroes$ = this.heroService.heroes$.pipe(
    // Randomly pick the "top" heroes
    map(heroes => [...heroes].sort(() => Math.random() - Math.random()).slice(0, 4))
  );

  constructor(private heroService: HeroService) { }

}
