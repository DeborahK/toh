import { Component } from '@angular/core';

import { HeroService } from '../hero.service';

@Component({
  selector: 'app-hero-search',
  templateUrl: './hero-search.component.html',
  styleUrls: ['./hero-search.component.css']
})
export class HeroSearchComponent {
  // DJK3 Assign to the declared Observable in the service
  heroes$ = this.heroService.filteredHeroes$;

  constructor(private heroService: HeroService) { }

  // Push a search term into the observable stream.
  search(term: string): void {
    this.heroService.search(term);
  }
}
