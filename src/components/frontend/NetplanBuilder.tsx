'use client'

import { useDeferredValue, useEffect, useState } from 'react'

import type { LocaleCode } from '@/lib/frontend'
import {
  buildNetplanCommands,
  buildNetplanExplanation,
  buildNetplanYaml,
  createInterfaceForKind,
  createNetplanBuilderState,
  type NetplanBuilderState,
  type NetplanInterfaceForm,
  type NetplanInterfaceKind,
  type NetplanPreset,
  validateNetplanState,
} from '@/lib/netplan'

type Props = {
  initialPreset: NetplanPreset
  locale: LocaleCode
}

type PreviewTab = 'yaml' | 'explanation' | 'commands'

function labels(locale: LocaleCode) {
  return {
    addChip: locale === 'de' ? 'Hinzufügen' : 'Add',
    addInterface: locale === 'de' ? 'Interface ergänzen' : 'Add interface',
    advanced: locale === 'de' ? 'Advanced' : 'Advanced',
    basic: locale === 'de' ? 'Einfach' : 'Beginner',
    bridge: locale === 'de' ? 'Bridge' : 'Bridge',
    bridgeMembers: locale === 'de' ? 'Bridge-Member' : 'Bridge members',
    bridgeName: locale === 'de' ? 'Bridge-Name' : 'Bridge name',
    commands: locale === 'de' ? 'Befehle' : 'Commands',
    copy: locale === 'de' ? 'YAML kopieren' : 'Copy YAML',
    copied: locale === 'de' ? 'Kopiert' : 'Copied',
    dhcp: locale === 'de' ? 'DHCP' : 'DHCP',
    dhcp6: locale === 'de' ? 'DHCPv6 aktivieren' : 'Enable DHCPv6',
    dnsServers: locale === 'de' ? 'DNS-Server' : 'DNS servers',
    download: locale === 'de' ? 'Datei laden' : 'Download file',
    ethernet: locale === 'de' ? 'Ethernet' : 'Ethernet',
    explanation: locale === 'de' ? 'Erklärung' : 'Explanation',
    fileName: locale === 'de' ? 'Dateiname' : 'File name',
    gateway: locale === 'de' ? 'Gateway' : 'Gateway',
    interfaceName: locale === 'de' ? 'Adaptername' : 'Adapter name',
    interfaceType: locale === 'de' ? 'Typ' : 'Type',
    ipAddress: locale === 'de' ? 'IPv4-Adresse' : 'IPv4 address',
    ipv6Address: locale === 'de' ? 'IPv6-Adresse' : 'IPv6 address',
    ipv6Dns: locale === 'de' ? 'IPv6-DNS' : 'IPv6 DNS',
    ipv6Gateway: locale === 'de' ? 'IPv6-Gateway' : 'IPv6 gateway',
    mtu: locale === 'de' ? 'MTU' : 'MTU',
    optional: locale === 'de' ? 'optional: true' : 'optional: true',
    parent: locale === 'de' ? 'Parent-Adapter' : 'Parent adapter',
    prefix: locale === 'de' ? 'Prefix / CIDR' : 'Prefix / CIDR',
    presetBridge: locale === 'de' ? 'Bridge' : 'Bridge',
    presetGeneral: locale === 'de' ? 'Generator' : 'Generator',
    presetStatic: locale === 'de' ? 'Static IP' : 'Static IP',
    presetVlan: locale === 'de' ? 'VLAN' : 'VLAN',
    preview: locale === 'de' ? 'Netplan YAML' : 'Netplan YAML',
    remove: locale === 'de' ? 'Entfernen' : 'Remove',
    renderer: locale === 'de' ? 'Renderer' : 'Renderer',
    searchDomains: locale === 'de' ? 'Search Domains' : 'Search domains',
    static: locale === 'de' ? 'Statisch' : 'Static',
    statusErrors: locale === 'de' ? 'Fehler' : 'Errors',
    statusWarnings: locale === 'de' ? 'Hinweise' : 'Warnings',
    useAdvanced: locale === 'de' ? 'Erweiterte Optionen' : 'Advanced settings',
    vlan: locale === 'de' ? 'VLAN' : 'VLAN',
    vlanId: locale === 'de' ? 'VLAN-ID' : 'VLAN ID',
    wakeOnLan: locale === 'de' ? 'Wake-on-LAN' : 'Wake-on-LAN',
    yamlFileHelp:
      locale === 'de'
        ? 'Empfohlener Pfad unter `/etc/netplan/`.'
        : 'Recommended target path under `/etc/netplan/`.',
  }
}

function cloneState(state: NetplanBuilderState): NetplanBuilderState {
  return JSON.parse(JSON.stringify(state)) as NetplanBuilderState
}

function kindLabel(locale: LocaleCode, kind: NetplanInterfaceKind) {
  const map = labels(locale)

  if (kind === 'bridge') {
    return map.bridge
  }

  if (kind === 'vlan') {
    return map.vlan
  }

  return map.ethernet
}

export function NetplanBuilder({ initialPreset, locale }: Props) {
  const t = labels(locale)
  const [builder, setBuilder] = useState<NetplanBuilderState>(() => createNetplanBuilderState(initialPreset))
  const [activeTab, setActiveTab] = useState<PreviewTab>('yaml')
  const [copied, setCopied] = useState(false)
  const yaml = buildNetplanYaml(builder)
  const deferredYaml = useDeferredValue(yaml)
  const explanation = buildNetplanExplanation(builder, locale)
  const commands = buildNetplanCommands(builder)
  const { errors, warnings } = validateNetplanState(builder, locale)

  useEffect(() => {
    setBuilder(createNetplanBuilderState(initialPreset))
  }, [initialPreset])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [copied])

  const updateInterface = (id: string, updater: (current: NetplanInterfaceForm) => NetplanInterfaceForm) => {
    setBuilder((current) => ({
      ...current,
      interfaces: current.interfaces.map((item) => (item.id === id ? updater(item) : item)),
    }))
  }

  const updatePreset = (preset: NetplanPreset) => {
    setBuilder(createNetplanBuilderState(preset))
  }

  const addInterface = (kind: NetplanInterfaceKind) => {
    setBuilder((current) => {
      const next = cloneState(current)
      next.interfaces.push(createInterfaceForKind(kind, current.interfaces.length + 1))
      return next
    })
  }

  const removeInterface = (id: string) => {
    setBuilder((current) => ({
      ...current,
      interfaces: current.interfaces.length > 1 ? current.interfaces.filter((item) => item.id !== id) : current.interfaces,
    }))
  }

  const copyYaml = async () => {
    await navigator.clipboard.writeText(yaml)
    setCopied(true)
  }

  const downloadYaml = () => {
    const blob = new Blob([yaml], { type: 'application/x-yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = builder.fileName.trim() || '01-spacepc-netplan.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="tool-builder">
      <div className="tool-builder__controls">
        <section className="tool-card tool-builder__panel">
          <div className="tool-builder__panel-head">
            <div>
              <p className="eyebrow">Preset</p>
              <h2>{locale === 'de' ? 'Netplan Builder' : 'Netplan Builder'}</h2>
            </div>

            <div className="tool-toggle-group">
              {([
                ['general', t.presetGeneral],
                ['static', t.presetStatic],
                ['bridge', t.presetBridge],
                ['vlan', t.presetVlan],
              ] as Array<[NetplanPreset, string]>).map(([preset, label]) => (
                <button
                  className={`tool-toggle ${builder.preset === preset ? 'tool-toggle--active' : ''}`}
                  key={preset}
                  onClick={() => updatePreset(preset)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-field-grid tool-field-grid--top">
            <label className="tool-field">
              <span>{t.fileName}</span>
              <input
                onChange={(event) =>
                  setBuilder((current) => ({
                    ...current,
                    fileName: event.target.value,
                  }))
                }
                type="text"
                value={builder.fileName}
              />
              <small>{t.yamlFileHelp}</small>
            </label>

            <label className="tool-field">
              <span>{t.renderer}</span>
              <select
                onChange={(event) =>
                  setBuilder((current) => ({
                    ...current,
                    renderer: event.target.value as NetplanBuilderState['renderer'],
                  }))
                }
                value={builder.renderer}
              >
                <option value="networkd">networkd</option>
                <option value="NetworkManager">NetworkManager</option>
              </select>
            </label>
          </div>

          <div className="tool-toggle-group">
            {([
              ['beginner', t.basic],
              ['advanced', t.advanced],
            ] as Array<[NetplanBuilderState['viewMode'], string]>).map(([mode, label]) => (
              <button
                className={`tool-toggle ${builder.viewMode === mode ? 'tool-toggle--active' : ''}`}
                key={mode}
                onClick={() =>
                  setBuilder((current) => ({
                    ...current,
                    viewMode: mode,
                  }))
                }
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="tool-interface-stack">
          {builder.interfaces.map((item, index) => {
            const isAdvanced = builder.viewMode === 'advanced'

            return (
              <section className="tool-card tool-interface-card" key={item.id}>
                <div className="tool-interface-card__head">
                  <div>
                    <p className="eyebrow">
                      {locale === 'de' ? 'Interface' : 'Interface'} {index + 1}
                    </p>
                    <h3>{kindLabel(locale, item.kind)}</h3>
                  </div>

                  <button className="tool-link-button" onClick={() => removeInterface(item.id)} type="button">
                    {t.remove}
                  </button>
                </div>

                <div className="tool-field-grid">
                  <label className="tool-field">
                    <span>{t.interfaceType}</span>
                    <select
                      onChange={(event) =>
                        updateInterface(item.id, () => ({
                          ...createInterfaceForKind(event.target.value as NetplanInterfaceKind, index + 1),
                          id: item.id,
                        }))
                      }
                      value={item.kind}
                    >
                      <option value="ethernet">{t.ethernet}</option>
                      <option value="bridge">{t.bridge}</option>
                      <option value="vlan">{t.vlan}</option>
                    </select>
                  </label>

                  <label className="tool-field">
                    <span>{locale === 'de' ? 'IPv4-Modus' : 'IPv4 mode'}</span>
                    <select
                      onChange={(event) =>
                        updateInterface(item.id, (current) => ({
                          ...current,
                          mode: event.target.value as NetplanInterfaceForm['mode'],
                        }))
                      }
                      value={item.mode}
                    >
                      <option value="dhcp">{t.dhcp}</option>
                      <option value="static">{t.static}</option>
                    </select>
                  </label>

                  {item.kind === 'bridge' ? (
                    <label className="tool-field">
                      <span>{t.bridgeName}</span>
                      <input
                        onChange={(event) =>
                          updateInterface(item.id, (current) => ({
                            ...current,
                            bridgeName: event.target.value,
                          }))
                        }
                        type="text"
                        value={item.bridgeName}
                      />
                    </label>
                  ) : null}

                  {item.kind === 'vlan' ? (
                    <>
                      <label className="tool-field">
                        <span>{locale === 'de' ? 'VLAN-Interface' : 'VLAN interface'}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              interfaceName: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.interfaceName}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.parent}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              parentName: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.parentName}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.vlanId}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              vlanId: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.vlanId}
                        />
                      </label>
                    </>
                  ) : null}

                  {item.kind === 'ethernet' ? (
                    <label className="tool-field">
                      <span>{t.interfaceName}</span>
                      <input
                        onChange={(event) =>
                          updateInterface(item.id, (current) => ({
                            ...current,
                            interfaceName: event.target.value,
                          }))
                        }
                        type="text"
                        value={item.interfaceName}
                      />
                    </label>
                  ) : null}

                  {item.kind === 'bridge' ? (
                    <label className="tool-field tool-field--full">
                      <span>{t.bridgeMembers}</span>
                      <ChipEditor
                        locale={locale}
                        onChange={(next) =>
                          updateInterface(item.id, (current) => ({
                            ...current,
                            bridgeMembers: next,
                          }))
                        }
                        placeholder="ens18"
                        values={item.bridgeMembers}
                      />
                    </label>
                  ) : null}

                  {item.mode === 'static' ? (
                    <>
                      <label className="tool-field">
                        <span>{t.ipAddress}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              address: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.address}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.prefix}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              prefix: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.prefix}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.gateway}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              gateway: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.gateway}
                        />
                      </label>
                    </>
                  ) : null}

                  <label className="tool-field tool-field--full">
                    <span>{t.dnsServers}</span>
                    <ChipEditor
                      locale={locale}
                      onChange={(next) =>
                        updateInterface(item.id, (current) => ({
                          ...current,
                          dnsServers: next,
                        }))
                      }
                      placeholder="1.1.1.1"
                      values={item.dnsServers}
                    />
                  </label>

                  <label className="tool-field tool-field--full">
                    <span>{t.searchDomains}</span>
                    <ChipEditor
                      locale={locale}
                      onChange={(next) =>
                        updateInterface(item.id, (current) => ({
                          ...current,
                          searchDomains: next,
                        }))
                      }
                      placeholder="lab.local"
                      values={item.searchDomains}
                    />
                  </label>

                  {isAdvanced ? (
                    <>
                      <label className="tool-field">
                        <span>{t.mtu}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              mtu: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.mtu}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.ipv6Address}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              ipv6Address: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.ipv6Address}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{locale === 'de' ? 'IPv6-Prefix' : 'IPv6 prefix'}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              ipv6Prefix: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.ipv6Prefix}
                        />
                      </label>

                      <label className="tool-field">
                        <span>{t.ipv6Gateway}</span>
                        <input
                          onChange={(event) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              ipv6Gateway: event.target.value,
                            }))
                          }
                          type="text"
                          value={item.ipv6Gateway}
                        />
                      </label>

                      <label className="tool-field tool-field--full">
                        <span>{t.ipv6Dns}</span>
                        <ChipEditor
                          locale={locale}
                          onChange={(next) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              ipv6DnsServers: next,
                            }))
                          }
                          placeholder="2606:4700:4700::1111"
                          values={item.ipv6DnsServers}
                        />
                      </label>

                      <div className="tool-checkboxes">
                        <Checkbox
                          checked={item.dhcp6}
                          label={t.dhcp6}
                          onChange={(checked) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              dhcp6: checked,
                            }))
                          }
                        />
                        <Checkbox
                          checked={item.optional}
                          label={t.optional}
                          onChange={(checked) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              optional: checked,
                            }))
                          }
                        />
                        <Checkbox
                          checked={item.wakeOnLan}
                          label={t.wakeOnLan}
                          onChange={(checked) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              wakeOnLan: checked,
                            }))
                          }
                        />
                        <Checkbox
                          checked={item.acceptRa}
                          label="accept-ra"
                          onChange={(checked) =>
                            updateInterface(item.id, (current) => ({
                              ...current,
                              acceptRa: checked,
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>

        <div className="tool-builder__actions">
          <button className="button button--secondary" onClick={() => addInterface('ethernet')} type="button">
            {t.addInterface}: {t.ethernet}
          </button>
          <button className="button button--secondary" onClick={() => addInterface('bridge')} type="button">
            {t.addInterface}: {t.bridge}
          </button>
          <button className="button button--secondary" onClick={() => addInterface('vlan')} type="button">
            {t.addInterface}: {t.vlan}
          </button>
        </div>
      </div>

      <aside className="tool-builder__preview">
        <section className="tool-card tool-preview-card">
          <div className="tool-preview-card__head">
            <div className="tool-tabs">
              <button
                className={`tool-tab ${activeTab === 'yaml' ? 'tool-tab--active' : ''}`}
                onClick={() => setActiveTab('yaml')}
                type="button"
              >
                {t.preview}
              </button>
              <button
                className={`tool-tab ${activeTab === 'explanation' ? 'tool-tab--active' : ''}`}
                onClick={() => setActiveTab('explanation')}
                type="button"
              >
                {t.explanation}
              </button>
              <button
                className={`tool-tab ${activeTab === 'commands' ? 'tool-tab--active' : ''}`}
                onClick={() => setActiveTab('commands')}
                type="button"
              >
                {t.commands}
              </button>
            </div>

            <div className="tool-preview-card__buttons">
              <button className="button button--secondary" onClick={copyYaml} type="button">
                {copied ? t.copied : t.copy}
              </button>
              <button className="button button--primary" onClick={downloadYaml} type="button">
                {t.download}
              </button>
            </div>
          </div>

          {errors.length > 0 ? (
            <div className="tool-status tool-status--error">
              <strong>{t.statusErrors}</strong>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="tool-status tool-status--warning">
              <strong>{t.statusWarnings}</strong>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {activeTab === 'yaml' ? (
            <pre className="tool-preview-card__code">
              <code>{deferredYaml}</code>
            </pre>
          ) : null}

          {activeTab === 'explanation' ? (
            <div className="tool-preview-card__body">
              {explanation.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}

          {activeTab === 'commands' ? (
            <div className="tool-preview-card__body">
              <p>
                {locale === 'de'
                  ? 'Nach dem Download sollte die Datei zuerst mit `netplan try` getestet werden.'
                  : 'After downloading the file, test it with `netplan try` before applying it.'}
              </p>
              <pre className="tool-preview-card__code">
                <code>{commands.join('\n')}</code>
              </pre>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  )
}

function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="tool-checkbox">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}

function ChipEditor({
  locale,
  onChange,
  placeholder,
  values,
}: {
  locale: LocaleCode
  onChange: (values: string[]) => void
  placeholder: string
  values: string[]
}) {
  const t = labels(locale)
  const [draft, setDraft] = useState('')

  const addValue = () => {
    const normalized = draft.trim()

    if (!normalized) {
      return
    }

    onChange([...values, normalized])
    setDraft('')
  }

  return (
    <div className="chip-editor">
      <div className="chip-editor__list">
        {values.map((value) => (
          <button className="chip-editor__chip" key={value} onClick={() => onChange(values.filter((item) => item !== value))} type="button">
            <span>{value}</span>
            <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <div className="chip-editor__input-row">
        <input
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue()
            }
          }}
          placeholder={placeholder}
          type="text"
          value={draft}
        />
        <button className="tool-link-button" onClick={addValue} type="button">
          {t.addChip}
        </button>
      </div>
    </div>
  )
}
