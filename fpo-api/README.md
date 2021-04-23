# Family Protection Order API

## Overview

The API provides an interface into the database for Family Protection Order.

## Development

The API is developed in Django/Python, using a Visual Studio 2017 project.

## Development Deployment Environment

To deploy Family Protection Order on an instance of OpenShift, see [the instructions](../RunningLocal.md) in the file RunningLocal.md.

- [Schema Spy](http://schema-spy-jag-csb-jes-family-protection-order.apps.silver.devops.gov.bc.ca/)
- [Open API (Swagger) API Explorer](http://django-jag-csb-jes-family-protection-order.apps.silver.devops.gov.bc.ca/api/v1/)

## Database Migrations

Migrations are triggered automatically when the Django/Python container is deployed.  The process it triggered by wrapper code injected as part of the s2i-python-container build; https://github.com/sclorg/s2i-python-container/blob/master/3.6/s2i/bin/run

## ToDo:
- The auto-generated views are constructed using generics and a number of mixins.
  - Determine if there is a better way to do this.  Since it's not as clean as something constructed from ModelSerializer or HyperlinkedModelSerializer.
