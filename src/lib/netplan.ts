import type { LocaleCode } from './frontend'

export const NETPLAN_TOOL_SLUGS = [
  'netplan-generator',
  'netplan-static-ip-generator',
  'netplan-bridge-generator',
  'netplan-vlan-generator',
] as const

export type NetplanToolSlug = (typeof NETPLAN_TOOL_SLUGS)[number]
export type NetplanPreset = 'general' | 'static' | 'bridge' | 'vlan'
export type NetplanInterfaceKind = 'ethernet' | 'bridge' | 'vlan'
export type NetplanMode = 'dhcp' | 'static'
export type NetplanViewMode = 'beginner' | 'advanced'

export type NetplanInterfaceForm = {
  acceptRa: boolean
  address: string
  bridgeMembers: string[]
  bridgeName: string
  dhcp6: boolean
  dnsServers: string[]
  gateway: string
  id: string
  interfaceName: string
  ipv6Address: string
  ipv6DnsServers: string[]
  ipv6Gateway: string
  ipv6Prefix: string
  kind: NetplanInterfaceKind
  mode: NetplanMode
  mtu: string
  optional: boolean
  parentName: string
  prefix: string
  searchDomains: string[]
  vlanId: string
  wakeOnLan: boolean
}

export type NetplanBuilderState = {
  fileName: string
  interfaces: NetplanInterfaceForm[]
  preset: NetplanPreset
  renderer: 'networkd' | 'NetworkManager'
  viewMode: NetplanViewMode
}

type NetplanToolContent = {
  answerLabel: string
  builderEyebrow: string
  builderLead: string
  commandLabel: string
  description: string
  explanationLabel: string
  faq: Array<{ answer: string; question: string }>
  featureLabel: string
  features: string[]
  heroEyebrow: string
  lead: string
  relatedLabel: string
  relatedLead: string
  staticIpLead: string
  title: string
  toolIndexDescription: string
  toolIndexLead: string
  toolIndexTitle: string
  useCaseLabel: string
  useCases: string[]
}

type NetplanToolDefinition = {
  content: Record<LocaleCode, NetplanToolContent>
  preset: NetplanPreset
  related: NetplanToolSlug[]
}

export const NETPLAN_TOOL_DEFINITIONS: Record<NetplanToolSlug, NetplanToolDefinition> = {
  'netplan-generator': {
    content: {
      de: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Live Builder',
        builderLead:
          'Adapter, IP, Subnetz, Gateway, DNS, Search Domains und erweiterte Optionen werden direkt in gültige Netplan-YAML übersetzt.',
        commandLabel: 'Befehle',
        description:
          'Interaktiver Netplan Config Generator für Ubuntu und andere Linux-Systeme mit Netplan. YAML live erzeugen, prüfen, kopieren und als Datei herunterladen.',
        explanationLabel: 'Erklärung',
        faq: [
          {
            answer:
              'Der Generator baut die YAML direkt aus deinen Eingaben auf und aktualisiert die Ausgabe ohne Reload. So lassen sich Fehler in IP, DNS oder VLAN-IDs sofort erkennen.',
            question: 'Wie funktioniert die Live-Generierung?',
          },
          {
            answer:
              'Für Bridging werden die Member-Interfaces als Unterbau angelegt und die eigentliche IP-Konfiguration auf dem Bridge-Device ausgegeben. Für VLANs entsteht ein eigener `vlans`-Block mit `id` und `link`.',
            question: 'Unterstützt das Tool Bridges und VLANs?',
          },
          {
            answer:
              'Ja. Die YAML kann kopiert oder als Datei wie `01-spacepc-netplan.yaml` heruntergeladen werden. Danach sollte sie mit `netplan try` getestet werden.',
            question: 'Kann ich die Konfiguration direkt übernehmen?',
          },
        ],
        featureLabel: 'Was das Tool abdeckt',
        features: [
          'Mehrere Interfaces in einer Datei',
          'DHCP und statische IPv4-Konfiguration',
          'DNS-Server und Search Domains als Listen',
          'Bridge- und VLAN-Blöcke mit passenden Feldern',
          'Advanced-Modus für DHCP6, MTU, `optional`, Wake-on-LAN und `accept-ra`',
        ],
        heroEyebrow: 'Tools / Netplan',
        lead:
          'Der Netplan Config Generator baut vollständige `*.yaml`-Dateien für Ubuntu Server, Homelab-Setups, VLAN-Uplinks und Bridge-Konfigurationen direkt im Browser.',
        relatedLabel: 'Weitere Landingpages',
        relatedLead:
          'Jede Variante fokussiert einen konkreten Use Case und startet mit einem passenden Preset.',
        staticIpLead: 'Live YAML für Ubuntu Server, VMs, Rootserver und Homelab-Hosts generieren.',
        title: 'Netplan Config Generator',
        toolIndexDescription:
          'Generatoren für Netplan-Konfigurationen mit Live-YAML, Validierung und mehreren Linux-Netzwerk-Use-Cases.',
        toolIndexLead:
          'Interaktive Werkzeuge für Netplan, Ubuntu-Netzwerk-Setups und saubere YAML-Dateien.',
        toolIndexTitle: 'Netzwerk-Tools',
        useCaseLabel: 'Geeignet für',
        useCases: [
          'Ubuntu Server mit statischer IP',
          'KVM- und Proxmox-nahe Bridge-Setups',
          'VLAN-Uplinks im Homelab oder Rack',
          'Mehrere NICs in einer gemeinsamen Datei',
        ],
      },
      en: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Live Builder',
        builderLead:
          'Adapter names, IPs, subnets, gateways, DNS, search domains, and advanced settings are translated into valid Netplan YAML in real time.',
        commandLabel: 'Commands',
        description:
          'Interactive Netplan config generator for Ubuntu and other Linux systems using Netplan. Generate YAML live, validate it, copy it, and download it as a file.',
        explanationLabel: 'Explanation',
        faq: [
          {
            answer:
              'The builder assembles the YAML directly from the form state and updates it without a reload. That makes invalid IPs, DNS values, or VLAN IDs visible immediately.',
            question: 'How does the live generation work?',
          },
          {
            answer:
              'Yes. Bridge members are emitted as the lower-layer devices and the IP config is placed on the bridge device. VLANs are emitted in a dedicated `vlans` block with `id` and `link`.',
            question: 'Does it support bridges and VLANs?',
          },
          {
            answer:
              'Yes. You can copy the YAML or download it as a file such as `01-spacepc-netplan.yaml`. It should still be tested with `netplan try` before applying it.',
            question: 'Can I use the generated file directly?',
          },
        ],
        featureLabel: 'What the tool covers',
        features: [
          'Multiple interfaces in one file',
          'DHCP and static IPv4 configuration',
          'DNS servers and search domains as editable lists',
          'Bridge and VLAN blocks with dedicated fields',
          'Advanced mode for DHCP6, MTU, `optional`, Wake-on-LAN, and `accept-ra`',
        ],
        heroEyebrow: 'Tools / Netplan',
        lead:
          'The Netplan Config Generator builds complete `*.yaml` files for Ubuntu Server, homelab setups, VLAN uplinks, and bridge configurations directly in the browser.',
        relatedLabel: 'More landing pages',
        relatedLead:
          'Each variant focuses on a specific use case and starts with a matching preset.',
        staticIpLead: 'Generate live YAML for Ubuntu servers, VMs, dedicated servers, and homelab hosts.',
        title: 'Netplan Config Generator',
        toolIndexDescription:
          'Netplan configuration generators with live YAML, validation, and multiple Linux networking use cases.',
        toolIndexLead: 'Interactive tools for Netplan, Ubuntu networking, and clean YAML generation.',
        toolIndexTitle: 'Network Tools',
        useCaseLabel: 'Built for',
        useCases: [
          'Ubuntu servers with static IPs',
          'Bridge setups for KVM-style virtualisation hosts',
          'VLAN uplinks in homelabs or racks',
          'Multiple NICs in a single Netplan file',
        ],
      },
    },
    preset: 'general',
    related: ['netplan-static-ip-generator', 'netplan-bridge-generator', 'netplan-vlan-generator'],
  },
  'netplan-static-ip-generator': {
    content: {
      de: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Static IP Preset',
        builderLead:
          'Das Preset startet mit einer klassischen Server-Konfiguration: Adaptername, feste IPv4, Prefix, Gateway, DNS und Search Domains.',
        commandLabel: 'Befehle',
        description:
          'Netplan Static IP Generator für Ubuntu. Statische IPv4-Konfiguration mit DNS, Search Domains und sauberer YAML live erzeugen.',
        explanationLabel: 'Erklärung',
        faq: [
          {
            answer:
              'Ja. Das Static-IP-Preset blendet unnötige Komplexität aus und startet direkt mit den Feldern, die für einen typischen Ubuntu-Server relevant sind.',
            question: 'Ist diese Seite für feste IPs optimiert?',
          },
          {
            answer:
              'Der Generator schreibt die Adresse als CIDR, ergänzt Nameserver und erzeugt für das Default-Gateway einen `routes`-Eintrag. Dadurch bleibt die Ausgabe kompatibel zu modernen Netplan-Setups.',
            question: 'Wie wird Gateway und DNS ausgegeben?',
          },
          {
            answer:
              'Ja. Du kannst weitere Interface-Karten ergänzen und so mehrere statische NICs in derselben Netplan-Datei erzeugen.',
            question: 'Sind mehrere Interfaces möglich?',
          },
        ],
        featureLabel: 'Fokus',
        features: [
          'Statische IPv4 als sauberer `addresses`-Block',
          'Default-Route über `routes` statt veralteter Felder',
          'Mehrere DNS-Server und Search Domains',
          'Ideal für VMs, Rootserver und kleine Infrastrukturknoten',
          'Direktes Downloaden als `01-netplan.yaml`',
        ],
        heroEyebrow: 'Tools / Static IP',
        lead:
          'Diese Landingpage fokussiert die häufigste Netplan-Aufgabe: eine feste IPv4-Adresse mit Gateway, DNS und Suchdomänen für Ubuntu Server und Linux-VMs.',
        relatedLabel: 'Verwandte Tools',
        relatedLead: 'Falls du statt einer Einzel-IP eine Bridge oder ein VLAN brauchst, sind die Spezialseiten direkter.',
        staticIpLead: 'Statische IP-Konfiguration ohne unnötige Felder oder YAML-Handarbeit.',
        title: 'Netplan Static IP Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typische Einsätze',
        useCases: [
          'Ubuntu Server in Hetzner-, KVM- oder VMware-VMs',
          'Homelab-Systeme mit fester Management-IP',
          'DNS- und Monitoring-Knoten mit stabilen Adressen',
          'Kleine Services, die nicht über DHCP laufen sollen',
        ],
      },
      en: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Static IP Preset',
        builderLead:
          'This preset starts with a classic server configuration: adapter name, static IPv4, prefix, gateway, DNS, and search domains.',
        commandLabel: 'Commands',
        description:
          'Netplan Static IP Generator for Ubuntu. Generate static IPv4 Netplan YAML with DNS and search domains live in the browser.',
        explanationLabel: 'Explanation',
        faq: [
          {
            answer:
              'Yes. The static-IP preset removes unnecessary complexity and opens with the fields that matter for a typical Ubuntu server.',
            question: 'Is this page optimised for fixed IPs?',
          },
          {
            answer:
              'The builder writes the address in CIDR form, adds nameservers, and emits the default gateway as a `routes` entry. That keeps the output aligned with modern Netplan usage.',
            question: 'How are gateway and DNS emitted?',
          },
          {
            answer:
              'Yes. You can add more interface cards and generate multiple static NICs within the same Netplan file.',
            question: 'Can it handle multiple interfaces?',
          },
        ],
        featureLabel: 'Focus',
        features: [
          'Static IPv4 as a clean `addresses` block',
          'Default route via `routes` instead of deprecated fields',
          'Multiple DNS servers and search domains',
          'Ideal for VMs, dedicated servers, and small infrastructure nodes',
          'Direct download as `01-netplan.yaml`',
        ],
        heroEyebrow: 'Tools / Static IP',
        lead:
          'This landing page focuses on the most common Netplan task: assigning a fixed IPv4 with gateway, DNS, and search domains for Ubuntu servers and Linux VMs.',
        relatedLabel: 'Related tools',
        relatedLead: 'If you need a bridge or VLAN instead of a single IP, the specialised pages start closer to that target.',
        staticIpLead: 'Static IP configuration without unnecessary fields or manual YAML work.',
        title: 'Netplan Static IP Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typical use cases',
        useCases: [
          'Ubuntu servers in Hetzner, KVM, or VMware VMs',
          'Homelab systems with fixed management IPs',
          'DNS and monitoring nodes that need stable addresses',
          'Small services that should not rely on DHCP',
        ],
      },
    },
    preset: 'static',
    related: ['netplan-generator', 'netplan-bridge-generator', 'netplan-vlan-generator'],
  },
  'netplan-bridge-generator': {
    content: {
      de: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Bridge Preset',
        builderLead:
          'Das Bridge-Preset startet mit Bridge-Name, Member-Interfaces und der IP-Konfiguration auf dem Bridge-Device statt auf dem physischen Adapter.',
        commandLabel: 'Befehle',
        description:
          'Netplan Bridge Generator für Ubuntu. Bridge-Konfigurationen mit Member-Interfaces, statischer IP, DNS und sauberer YAML live erzeugen.',
        explanationLabel: 'Erklärung',
        faq: [
          {
            answer:
              'Die Seite ist für Hosts gedacht, auf denen VMs, Container oder virtuelle Switches eine Bridge brauchen. Die IP liegt auf `br0` oder einem anderen Bridge-Namen, nicht auf dem Uplink-Port.',
            question: 'Wann brauche ich den Bridge Generator?',
          },
          {
            answer:
              'Ja. Du kannst mehrere Member-Interfaces eintragen, etwa für mehrere Ports in einer Bridge. Für Bonding wäre später eine eigene Spezialseite sinnvoll.',
            question: 'Kann eine Bridge mehrere Ports enthalten?',
          },
          {
            answer:
              'Das Tool erzeugt die Bridge-Struktur korrekt, trotzdem solltest du vor dem Anwenden immer `netplan try` nutzen, besonders auf Remote-Hosts.',
            question: 'Ist die Ausgabe für Produktionssysteme geeignet?',
          },
        ],
        featureLabel: 'Fokus',
        features: [
          'Bridge-Name und Member-Interfaces getrennt pflegen',
          'IP und DNS auf der Bridge statt auf dem physischen Port',
          'Mehrere Ports pro Bridge möglich',
          'Geeignet für KVM-, LXD- und Virtualisierungshosts',
          'Direkter Wechsel in Advanced-Optionen für MTU und IPv6',
        ],
        heroEyebrow: 'Tools / Bridge',
        lead:
          'Diese Landingpage fokussiert Netplan-Bridges für Virtualisierung, Container-Hosts und andere Linux-Systeme, die ein eigenes Layer-2-Device mit sauberer IP-Konfiguration brauchen.',
        relatedLabel: 'Verwandte Tools',
        relatedLead: 'Für reine Server-IPs ist die Static-IP-Seite schlanker. Für VLAN-Uplinks gibt es ein eigenes Preset.',
        staticIpLead: 'Bridge-YAML mit live generierten Member- und Interface-Blöcken.',
        title: 'Netplan Bridge Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typische Einsätze',
        useCases: [
          'KVM-Hosts mit `br0` als VM-Uplink',
          'Container-Hosts mit gebridgtem LAN-Zugang',
          'Lab-Maschinen mit mehreren Ports in einem Bridge-Segment',
          'Migration von alten `/etc/network/interfaces`-Setups auf Netplan',
        ],
      },
      en: {
        answerLabel: 'FAQ',
        builderEyebrow: 'Bridge Preset',
        builderLead:
          'The bridge preset starts with a bridge name, member interfaces, and IP configuration on the bridge device rather than on the physical adapter.',
        commandLabel: 'Commands',
        description:
          'Netplan Bridge Generator for Ubuntu. Generate bridge configurations with member interfaces, static IPs, DNS, and clean YAML live in the browser.',
        explanationLabel: 'Explanation',
        faq: [
          {
            answer:
              'This page is meant for hosts where VMs, containers, or virtual switches need a bridge. The IP lives on `br0` or another bridge name, not on the uplink port itself.',
            question: 'When do I need the Bridge Generator?',
          },
          {
            answer:
              'Yes. You can enter multiple member interfaces, for example when a bridge should include more than one port. Dedicated bonding support would still deserve its own specialised page later.',
            question: 'Can a bridge include multiple ports?',
          },
          {
            answer:
              'The tool emits the correct bridge structure, but you should still run `netplan try` before applying it, especially on remote hosts.',
            question: 'Is the output safe for production hosts?',
          },
        ],
        featureLabel: 'Focus',
        features: [
          'Manage bridge names and member interfaces separately',
          'Assign IP and DNS to the bridge instead of the physical port',
          'Support multiple ports per bridge',
          'Suitable for KVM, LXD, and virtualisation hosts',
          'Direct access to advanced options such as MTU and IPv6',
        ],
        heroEyebrow: 'Tools / Bridge',
        lead:
          'This landing page focuses on Netplan bridges for virtualisation, container hosts, and Linux systems that need a dedicated layer-2 device with a clean IP configuration.',
        relatedLabel: 'Related tools',
        relatedLead: 'For ordinary server IPs the static-IP page is leaner. VLAN uplinks have their own preset.',
        staticIpLead: 'Bridge YAML with live-generated member and interface blocks.',
        title: 'Netplan Bridge Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typical use cases',
        useCases: [
          'KVM hosts using `br0` as a VM uplink',
          'Container hosts with bridged LAN access',
          'Lab machines with multiple ports in one bridge segment',
          'Migrations from legacy `/etc/network/interfaces` setups to Netplan',
        ],
      },
    },
    preset: 'bridge',
    related: ['netplan-generator', 'netplan-static-ip-generator', 'netplan-vlan-generator'],
  },
  'netplan-vlan-generator': {
    content: {
      de: {
        answerLabel: 'FAQ',
        builderEyebrow: 'VLAN Preset',
        builderLead:
          'Das VLAN-Preset startet mit VLAN-ID, Parent-Adapter und dem virtuellen Interface-Namen. IP, DNS und Domains werden direkt auf dem VLAN-Device gepflegt.',
        commandLabel: 'Befehle',
        description:
          'Netplan VLAN Generator für Ubuntu. VLAN-Interfaces mit ID, Parent-Link, statischer IP, DNS und Search Domains als YAML live erzeugen.',
        explanationLabel: 'Erklärung',
        faq: [
          {
            answer:
              'Die Seite hilft bei Netplan-Konfigurationen wie `vlan10`, `vlan20` oder produktionsnahen Tagged-Uplinks. Parent-Interface, VLAN-ID und IP-Konfiguration bleiben sauber getrennt.',
            question: 'Wofür ist der VLAN Generator gedacht?',
          },
          {
            answer:
              'Ja. Du kannst mehrere VLAN-Karten ergänzen und so verschiedene VLANs in derselben Datei erzeugen, auch mit unterschiedlichen DNS- oder Gateway-Angaben.',
            question: 'Kann ich mehrere VLANs anlegen?',
          },
          {
            answer:
              'Das Tool prüft unter anderem, ob die VLAN-ID zwischen 1 und 4094 liegt und ob grundlegende Pflichtfelder gesetzt sind. Fachliche Prüfung der Zielumgebung bleibt trotzdem nötig.',
            question: 'Wie streng validiert der Generator?',
          },
        ],
        featureLabel: 'Fokus',
        features: [
          'VLAN-ID, Parent-Link und Interface-Name separat',
          'Statische oder DHCP-basierte VLAN-Konfiguration',
          'Mehrere VLAN-Interfaces in einer Datei',
          'Direkte Ausgabe des `vlans`-Blocks in Netplan-Struktur',
          'Geeignet für Server, Firewalls und Homelab-Uplinks',
        ],
        heroEyebrow: 'Tools / VLAN',
        lead:
          'Diese Landingpage fokussiert getaggte Netplan-Interfaces für Server, Router-nahe Setups und Homelab-Uplinks. Die YAML entsteht live aus den Feldern für ID, Parent-Link und Adressierung.',
        relatedLabel: 'Verwandte Tools',
        relatedLead: 'Wenn du statt eines VLANs nur eine feste Adresse brauchst, ist die Static-IP-Seite schneller. Bridges haben ein eigenes Preset.',
        staticIpLead: 'VLAN-YAML mit klaren Feldern für ID, Link und IP-Konfiguration.',
        title: 'Netplan VLAN Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typische Einsätze',
        useCases: [
          'Tagged Server-Uplinks zu Switches oder Hypervisoren',
          'Management- und Storage-VLANs auf Ubuntu Hosts',
          'Homelab-Router, Firewalls und Multi-Segment-Setups',
          'Migration von manuellen VLAN-Snippets auf saubere Netplan-Dateien',
        ],
      },
      en: {
        answerLabel: 'FAQ',
        builderEyebrow: 'VLAN Preset',
        builderLead:
          'The VLAN preset starts with a VLAN ID, parent adapter, and virtual interface name. IPs, DNS, and domains are configured directly on the VLAN device.',
        commandLabel: 'Commands',
        description:
          'Netplan VLAN Generator for Ubuntu. Generate VLAN interfaces with ID, parent link, static IP, DNS, and search domains as live YAML.',
        explanationLabel: 'Explanation',
        faq: [
          {
            answer:
              'This page is meant for Netplan configurations such as `vlan10`, `vlan20`, or production-style tagged uplinks. Parent interface, VLAN ID, and IP configuration stay cleanly separated.',
            question: 'What is the VLAN Generator for?',
          },
          {
            answer:
              'Yes. You can add multiple VLAN cards and generate different VLANs within one file, each with its own DNS or gateway settings if required.',
            question: 'Can I define multiple VLANs?',
          },
          {
            answer:
              'The tool validates basic requirements such as VLAN IDs between 1 and 4094 and checks required fields. Environment-specific review is still necessary.',
            question: 'How strict is the validation?',
          },
        ],
        featureLabel: 'Focus',
        features: [
          'Separate fields for VLAN ID, parent link, and interface name',
          'Static or DHCP-based VLAN configuration',
          'Multiple VLAN interfaces in one file',
          'Direct emission of the Netplan `vlans` block',
          'Useful for servers, firewalls, and homelab uplinks',
        ],
        heroEyebrow: 'Tools / VLAN',
        lead:
          'This landing page focuses on tagged Netplan interfaces for servers, router-adjacent setups, and homelab uplinks. YAML is generated live from VLAN ID, parent link, and addressing fields.',
        relatedLabel: 'Related tools',
        relatedLead: 'If you only need a fixed server IP, the static-IP page is faster. Bridges have their own preset.',
        staticIpLead: 'VLAN YAML with clear fields for ID, link, and IP configuration.',
        title: 'Netplan VLAN Generator',
        toolIndexDescription: '',
        toolIndexLead: '',
        toolIndexTitle: '',
        useCaseLabel: 'Typical use cases',
        useCases: [
          'Tagged server uplinks to switches or hypervisors',
          'Management and storage VLANs on Ubuntu hosts',
          'Homelab routers, firewalls, and multi-segment setups',
          'Migrations from manual VLAN snippets to clean Netplan files',
        ],
      },
    },
    preset: 'vlan',
    related: ['netplan-generator', 'netplan-static-ip-generator', 'netplan-bridge-generator'],
  },
}

function createInterfaceId(index: number) {
  return `iface-${index}`
}

function createEthernetInterface(id: string): NetplanInterfaceForm {
  return {
    acceptRa: false,
    address: '192.168.1.20',
    bridgeMembers: ['ens18'],
    bridgeName: 'br0',
    dhcp6: false,
    dnsServers: ['1.1.1.1', '8.8.8.8'],
    gateway: '192.168.1.1',
    id,
    interfaceName: 'ens18',
    ipv6Address: '',
    ipv6DnsServers: [],
    ipv6Gateway: '',
    ipv6Prefix: '64',
    kind: 'ethernet',
    mode: 'static',
    mtu: '',
    optional: true,
    parentName: 'ens18',
    prefix: '24',
    searchDomains: ['lab.local'],
    vlanId: '10',
    wakeOnLan: false,
  }
}

function createBridgeInterface(id: string): NetplanInterfaceForm {
  return {
    ...createEthernetInterface(id),
    bridgeMembers: ['ens18'],
    bridgeName: 'br0',
    interfaceName: 'ens18',
    kind: 'bridge',
  }
}

function createVlanInterface(id: string): NetplanInterfaceForm {
  return {
    ...createEthernetInterface(id),
    bridgeMembers: [],
    interfaceName: 'vlan10',
    kind: 'vlan',
    parentName: 'ens18',
    vlanId: '10',
  }
}

export function createNetplanBuilderState(preset: NetplanPreset): NetplanBuilderState {
  const firstInterface =
    preset === 'bridge'
      ? createBridgeInterface(createInterfaceId(1))
      : preset === 'vlan'
        ? createVlanInterface(createInterfaceId(1))
        : createEthernetInterface(createInterfaceId(1))

  firstInterface.mode = preset === 'general' ? 'dhcp' : 'static'

  if (preset === 'general') {
    firstInterface.address = ''
    firstInterface.gateway = ''
    firstInterface.dnsServers = ['1.1.1.1']
    firstInterface.searchDomains = []
  }

  return {
    fileName: '01-spacepc-netplan.yaml',
    interfaces: [firstInterface],
    preset,
    renderer: 'networkd',
    viewMode: 'beginner',
  }
}

export function createInterfaceForKind(kind: NetplanInterfaceKind, index: number): NetplanInterfaceForm {
  if (kind === 'bridge') {
    return createBridgeInterface(createInterfaceId(index))
  }

  if (kind === 'vlan') {
    return createVlanInterface(createInterfaceId(index))
  }

  return createEthernetInterface(createInterfaceId(index))
}

type YamlValue = boolean | null | number | string | YamlArray | YamlObject
interface YamlArray extends Array<YamlValue> {}
interface YamlObject {
  [key: string]: YamlValue
}

function isPlainObject(value: YamlValue): value is YamlObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toYaml(value: YamlValue, indent = 0): string[] {
  const pad = ' '.repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${pad}[]`]
    }

    return value.flatMap((item) => {
      if (isPlainObject(item) || Array.isArray(item)) {
        const nested = toYaml(item, indent + 2)
        const [first, ...rest] = nested
        return [`${pad}- ${first.trimStart()}`, ...rest]
      }

      return [`${pad}- ${String(item)}`]
    })
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value)

    if (entries.length === 0) {
      return [`${pad}{}`]
    }

    return entries.flatMap(([key, entryValue]) => {
      if (Array.isArray(entryValue) || isPlainObject(entryValue)) {
        return [`${pad}${key}:`, ...toYaml(entryValue, indent + 2)]
      }

      return [`${pad}${key}: ${String(entryValue)}`]
    })
  }

  return [`${pad}${String(value)}`]
}

function trimList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function addAddress(addresses: string[], address: string, prefix: string) {
  const normalizedAddress = address.trim()
  const normalizedPrefix = prefix.trim()

  if (!normalizedAddress || !normalizedPrefix) {
    return
  }

  addresses.push(`${normalizedAddress}/${normalizedPrefix}`)
}

function buildNameservers(config: NetplanInterfaceForm) {
  const addresses = trimList([...config.dnsServers, ...config.ipv6DnsServers])
  const search = trimList(config.searchDomains)

  if (addresses.length === 0 && search.length === 0) {
    return null
  }

  const nameservers: YamlObject = {}

  if (search.length > 0) {
    nameservers.search = search
  }

  if (addresses.length > 0) {
    nameservers.addresses = addresses
  }

  return nameservers
}

function buildRoutes(config: NetplanInterfaceForm) {
  const routes: Array<YamlObject> = []

  if (config.gateway.trim()) {
    routes.push({
      to: 'default',
      via: config.gateway.trim(),
    })
  }

  if (config.ipv6Gateway.trim()) {
    routes.push({
      to: '::/0',
      via: config.ipv6Gateway.trim(),
    })
  }

  return routes.length > 0 ? routes : null
}

function buildCommonConfig(config: NetplanInterfaceForm): YamlObject {
  const result: YamlObject = {}

  result.dhcp4 = config.mode === 'dhcp'
  result.dhcp6 = config.dhcp6

  if (config.acceptRa) {
    result['accept-ra'] = true
  }

  if (config.optional) {
    result.optional = true
  }

  if (config.wakeOnLan) {
    result.wakeonlan = true
  }

  if (config.mtu.trim()) {
    result.mtu = Number(config.mtu.trim())
  }

  const addresses: string[] = []

  if (config.mode === 'static') {
    addAddress(addresses, config.address, config.prefix)
  }

  addAddress(addresses, config.ipv6Address, config.ipv6Prefix)

  if (addresses.length > 0) {
    result.addresses = addresses
  }

  const nameservers = buildNameservers(config)

  if (nameservers) {
    result.nameservers = nameservers
  }

  const routes = buildRoutes(config)

  if (routes) {
    result.routes = routes
  }

  return result
}

export function buildNetplanYaml(state: NetplanBuilderState) {
  const ethernets: YamlObject = {}
  const bridges: YamlObject = {}
  const vlans: YamlObject = {}

  for (const config of state.interfaces) {
    if (config.kind === 'bridge') {
      const members = trimList(config.bridgeMembers)

      for (const member of members) {
        if (!ethernets[member]) {
          ethernets[member] = {
            dhcp4: false,
            dhcp6: false,
            optional: config.optional,
          }
        }
      }

      bridges[config.bridgeName.trim() || 'br0'] = {
        interfaces: members,
        ...buildCommonConfig(config),
      }
      continue
    }

    if (config.kind === 'vlan') {
      const parent = config.parentName.trim()

      if (parent && !ethernets[parent]) {
        ethernets[parent] = {
          dhcp4: false,
          dhcp6: false,
          optional: true,
        }
      }

      vlans[config.interfaceName.trim() || 'vlan10'] = {
        id: Number(config.vlanId.trim() || '10'),
        link: parent || 'ens18',
        ...buildCommonConfig(config),
      }
      continue
    }

    ethernets[config.interfaceName.trim() || 'ens18'] = buildCommonConfig(config)
  }

  const network: YamlObject = {
    version: 2,
    renderer: state.renderer,
  }

  if (Object.keys(ethernets).length > 0) {
    network.ethernets = ethernets
  }

  if (Object.keys(bridges).length > 0) {
    network.bridges = bridges
  }

  if (Object.keys(vlans).length > 0) {
    network.vlans = vlans
  }

  return toYaml({ network }).join('\n')
}

function isValidIpv4(value: string) {
  const candidate = value.trim()

  if (!candidate) {
    return false
  }

  const parts = candidate.split('.')

  if (parts.length !== 4) {
    return false
  }

  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
}

function isValidIpv6(value: string) {
  const candidate = value.trim()
  return Boolean(candidate) && /^[0-9a-fA-F:]+$/.test(candidate) && candidate.includes(':')
}

function isValidPrefix(value: string, max: number) {
  const candidate = value.trim()
  return /^\d+$/.test(candidate) && Number(candidate) >= 0 && Number(candidate) <= max
}

function isLikelyDomain(value: string) {
  const candidate = value.trim()
  return candidate.length > 0 && /^[a-zA-Z0-9.-]+$/.test(candidate)
}

export function validateNetplanState(state: NetplanBuilderState, locale: LocaleCode) {
  const errors: string[] = []
  const warnings: string[] = []

  if (!state.fileName.trim().endsWith('.yaml')) {
    errors.push(locale === 'de' ? 'Der Dateiname sollte auf `.yaml` enden.' : 'The file name should end with `.yaml`.')
  }

  state.interfaces.forEach((config, index) => {
    const label =
      locale === 'de'
        ? `Interface ${index + 1}`
        : `Interface ${index + 1}`

    if (config.kind === 'ethernet' && !config.interfaceName.trim()) {
      errors.push(locale === 'de' ? `${label}: Adaptername fehlt.` : `${label}: adapter name is missing.`)
    }

    if (config.kind === 'bridge') {
      if (!config.bridgeName.trim()) {
        errors.push(locale === 'de' ? `${label}: Bridge-Name fehlt.` : `${label}: bridge name is missing.`)
      }

      if (trimList(config.bridgeMembers).length === 0) {
        errors.push(
          locale === 'de'
            ? `${label}: Mindestens ein Bridge-Member wird benötigt.`
            : `${label}: at least one bridge member is required.`,
        )
      }
    }

    if (config.kind === 'vlan') {
      if (!config.parentName.trim()) {
        errors.push(locale === 'de' ? `${label}: Parent-Adapter fehlt.` : `${label}: parent adapter is missing.`)
      }

      if (!isValidPrefix(config.vlanId, 4094) || Number(config.vlanId) < 1) {
        errors.push(locale === 'de' ? `${label}: VLAN-ID muss zwischen 1 und 4094 liegen.` : `${label}: VLAN ID must be between 1 and 4094.`)
      }
    }

    if (config.mode === 'static') {
      if (!isValidIpv4(config.address)) {
        errors.push(locale === 'de' ? `${label}: IPv4-Adresse ist ungültig.` : `${label}: IPv4 address is invalid.`)
      }

      if (!isValidPrefix(config.prefix, 32)) {
        errors.push(locale === 'de' ? `${label}: IPv4-Prefix ist ungültig.` : `${label}: IPv4 prefix is invalid.`)
      }

      if (config.gateway.trim() && !isValidIpv4(config.gateway)) {
        errors.push(locale === 'de' ? `${label}: Gateway ist ungültig.` : `${label}: gateway is invalid.`)
      }
    }

    for (const dns of trimList(config.dnsServers)) {
      if (!isValidIpv4(dns) && !isValidIpv6(dns)) {
        errors.push(locale === 'de' ? `${label}: DNS-Server "${dns}" ist ungültig.` : `${label}: DNS server "${dns}" is invalid.`)
      }
    }

    for (const dns of trimList(config.ipv6DnsServers)) {
      if (!isValidIpv6(dns) && !isValidIpv4(dns)) {
        errors.push(locale === 'de' ? `${label}: IPv6-DNS "${dns}" ist ungültig.` : `${label}: IPv6 DNS "${dns}" is invalid.`)
      }
    }

    for (const domain of trimList(config.searchDomains)) {
      if (!isLikelyDomain(domain)) {
        warnings.push(
          locale === 'de'
            ? `${label}: Search Domain "${domain}" sieht ungewöhnlich aus.`
            : `${label}: search domain "${domain}" looks unusual.`,
        )
      }
    }

    if (config.ipv6Address.trim() && !isValidIpv6(config.ipv6Address)) {
      errors.push(locale === 'de' ? `${label}: IPv6-Adresse ist ungültig.` : `${label}: IPv6 address is invalid.`)
    }

    if (config.ipv6Address.trim() && !isValidPrefix(config.ipv6Prefix, 128)) {
      errors.push(locale === 'de' ? `${label}: IPv6-Prefix ist ungültig.` : `${label}: IPv6 prefix is invalid.`)
    }

    if (config.ipv6Gateway.trim() && !isValidIpv6(config.ipv6Gateway)) {
      errors.push(locale === 'de' ? `${label}: IPv6-Gateway ist ungültig.` : `${label}: IPv6 gateway is invalid.`)
    }

    if (config.mode === 'dhcp' && !config.dhcp6 && trimList(config.dnsServers).length === 0) {
      warnings.push(
        locale === 'de'
          ? `${label}: DHCP4 ohne eigene DNS-Server ist in Ordnung, verlässt sich aber vollständig auf den Upstream.`
          : `${label}: DHCP4 without explicit DNS is valid, but fully depends on the upstream network.`,
      )
    }
  })

  return { errors, warnings }
}

export function buildNetplanExplanation(state: NetplanBuilderState, locale: LocaleCode) {
  return state.interfaces.map((config, index) => {
    const name =
      config.kind === 'bridge'
        ? config.bridgeName || 'br0'
        : config.kind === 'vlan'
          ? config.interfaceName || 'vlan10'
          : config.interfaceName || 'ens18'

    const intro =
      locale === 'de'
        ? `${index + 1}. ${name}: ${config.mode === 'dhcp' ? 'bezieht IPv4 per DHCP' : 'nutzt eine statische IPv4-Konfiguration'}.`
        : `${index + 1}. ${name}: ${config.mode === 'dhcp' ? 'uses DHCP for IPv4' : 'uses a static IPv4 configuration'}.`

    const details: string[] = []

    if (config.kind === 'bridge') {
      details.push(
        locale === 'de'
          ? `Bridge über ${trimList(config.bridgeMembers).join(', ') || 'keine Member gesetzt'}.`
          : `Bridge over ${trimList(config.bridgeMembers).join(', ') || 'no members set'}.`,
      )
    }

    if (config.kind === 'vlan') {
      details.push(
        locale === 'de'
          ? `VLAN ${config.vlanId || '?'} auf Parent ${config.parentName || '?'}.`
          : `VLAN ${config.vlanId || '?'} on parent ${config.parentName || '?'}.`,
      )
    }

    if (config.mode === 'static' && config.address && config.prefix) {
      details.push(
        locale === 'de'
          ? `Adresse ${config.address}/${config.prefix}.`
          : `Address ${config.address}/${config.prefix}.`,
      )
    }

    if (config.gateway) {
      details.push(locale === 'de' ? `Gateway ${config.gateway}.` : `Gateway ${config.gateway}.`)
    }

    const dns = trimList(config.dnsServers)

    if (dns.length > 0) {
      details.push(locale === 'de' ? `DNS: ${dns.join(', ')}.` : `DNS: ${dns.join(', ')}.`)
    }

    const search = trimList(config.searchDomains)

    if (search.length > 0) {
      details.push(
        locale === 'de' ? `Search Domains: ${search.join(', ')}.` : `Search domains: ${search.join(', ')}.`,
      )
    }

    return `${intro} ${details.join(' ')}`.trim()
  })
}

export function buildNetplanCommands(state: NetplanBuilderState) {
  const targetFile = `/etc/netplan/${state.fileName.trim() || '01-spacepc-netplan.yaml'}`

  return [
    `sudo cp ${state.fileName.trim() || '01-spacepc-netplan.yaml'} ${targetFile}`,
    'sudo netplan try',
    'sudo netplan apply',
  ]
}

export function getNetplanToolContent(locale: LocaleCode, slug: NetplanToolSlug) {
  return NETPLAN_TOOL_DEFINITIONS[slug].content[locale]
}

export function getNetplanPresetForTool(slug: NetplanToolSlug) {
  return NETPLAN_TOOL_DEFINITIONS[slug].preset
}

export function getRelatedNetplanTools(slug: NetplanToolSlug) {
  return NETPLAN_TOOL_DEFINITIONS[slug].related
}

export function isNetplanToolSlug(value: string): value is NetplanToolSlug {
  return NETPLAN_TOOL_SLUGS.includes(value as NetplanToolSlug)
}

export function getNetplanToolHref(locale: LocaleCode, slug: NetplanToolSlug) {
  return `/${locale}/tools/${slug}`
}
