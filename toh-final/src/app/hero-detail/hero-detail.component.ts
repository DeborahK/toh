import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { HeroService } from '../hero.service';
import { Hero } from '../hero';

@Component({
  selector: 'app-hero-detail',
  templateUrl: './hero-detail.component.html',
  styleUrls: ['./hero-detail.component.css']
})
export class HeroDetailComponent implements OnInit {

  // DJK2 Assign to the declared Observable in the service
  hero$ = this.heroService.hero$;

  constructor(
    private route: ActivatedRoute,
    private heroService: HeroService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.getHero();
  }


  getHero(): void {
    // Use the non-null assertion character
    // for strict typing checking
    const id = +this.route.snapshot.paramMap.get('id')!;

    // Or without the non-null assertion
    id2: Number;
    const value = this.route.snapshot.paramMap.get('id');
    if (value) {
      let id2 = +value;
    }

    // DJK2 Emit the selected id
    this.heroService.selectHero(id);
  }

  goBack(): void {
    this.location.back();
  }

  save(hero: Hero): void {
    this.heroService.updateHero(hero);
  }
}
