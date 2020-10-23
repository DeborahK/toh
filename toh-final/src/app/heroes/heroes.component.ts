import { Component } from '@angular/core';

import { Hero } from '../hero';
import { HeroService } from '../hero.service';

@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html',
  styleUrls: ['./heroes.component.css']
})
export class HeroesComponent {

  constructor(private heroService: HeroService) { }

  // DJK1 Assign to the declared Observable in the service
  heroes$ = this.heroService.heroes$;

  add(name: string): void {
    name = name.trim();
    if (!name) { return; }
    this.heroService.addHero({ name } as Hero);
  }

  delete(hero: Hero): void {
    this.heroService.deleteHero(hero);
  }

}
