import { Component, OnInit } from '@angular/core';
import { Hero } from '../hero';
import { HeroService } from '../hero.service';

import { map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // DJK 1: heroes$
  // heroes: Hero[] = [];

  // DJK 1: heroes$
  heroes$ = this.heroService.heroesWithCRUD$.pipe(
    map(heroes => heroes.slice(1, 5))
  );

  constructor(private heroService: HeroService) { }

  ngOnInit() {
    // DJK 1: heroes$
    //this.getHeroes();
  }

  // DJK 1: heroes$
  // getHeroes(): void {
  //   this.heroService.getHeroes()
  //     .subscribe(heroes => this.heroes = heroes.slice(1, 5));
  // }
}
